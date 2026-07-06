import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../core/services/room.service';
import { MixRuntimeService } from '../../core/services/mix-runtime.service';
import { BrumeService } from '../../core/services/brume.service';
import { championLoadingUrl } from '../../shared/lol-assets';
import { BrumeChatChannel, BrumeNightRecap, BrumeRole, BRUME_ROLE_LABELS, BRUME_ROLE_META, BRUME_TEAM_LABELS } from '../../core/models/brume.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

const REACTIONS = ['👀', '😱', '🤫', '🔥', '😈'];
const RESULT_STAGE_LABELS = ["Révéler les rôles", 'Voir les scores'];
const CONFETTI_COLORS = ['var(--gold)', 'var(--teal)', 'var(--danger)', 'var(--success)', 'var(--gold-bright)'];
/** Ordre d'affichage fixe du glossaire des roles (panneau lateral). */
const ROLE_LEGEND_ORDER: BrumeRole[] = ['warwick', 'fiddlesticks', 'thresh', 'ashe', 'poro', 'kindred'];

@Component({
  selector: 'app-brume',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brume.component.html',
  styleUrl: './brume.component.scss',
})
export class BrumeComponent {
  protected readonly resultStage = signal(0);
  protected readonly submittedToMix = signal(false);
  protected readonly pendingAction = signal<'consommer' | 'effroi' | null>(null);
  protected readonly selectedTarget = signal<string | null>(null);
  protected readonly dawnAnnounce = signal<BrumeNightRecap | null>(null);
  protected readonly voteAnnounce = signal<{ eliminatedId: string | null; eliminatedPseudo: string | null } | null>(null);
  protected packInput = '';
  protected assemblyInput = '';
  protected readonly reactions = REACTIONS;
  protected readonly confettiPieces = Array.from({ length: 20 }, (_, i) => i);
  private readonly now = signal(Date.now());
  private seenDawn: BrumeNightRecap | null = null;
  private seenVote: { eliminatedId: string | null; eliminatedPseudo: string | null } | null = null;

  private readonly packFeedRef = viewChild<ElementRef<HTMLDivElement>>('packFeed');
  private readonly dayFeedRef = viewChild<ElementRef<HTMLDivElement>>('dayFeed');

  protected readonly amIAlive = computed(() => {
    const id = this.room.myId();
    return !!id && this.brume.alivePlayerIds().includes(id);
  });
  protected readonly amISilenced = computed(() => {
    const dawn = this.brume.lastDawn();
    const id = this.room.myId();
    return !!id && !!dawn && dawn.silencedPseudos.includes(this.myPseudo() ?? '');
  });
  protected readonly aliveIncludingSelf = computed(() =>
    this.brume.players().filter((p) => this.brume.alivePlayerIds().includes(p.id)),
  );
  protected readonly othersAlive = computed(() =>
    this.aliveIncludingSelf().filter((p) => p.id !== this.room.myId()),
  );
  protected readonly marquePseudo = computed(
    () => this.brume.players().find((p) => p.id === this.brume.myKindredMarqueId())?.pseudo ?? '?',
  );
  protected readonly remainingSeconds = computed(() => {
    const deadline = this.brume.phaseDeadline();
    if (!deadline) return 0;
    return Math.max(0, Math.ceil((deadline - this.now()) / 1000));
  });
  protected readonly nightHint = computed(() => {
    if (!this.amIAlive()) return 'Attends la prochaine aube.';
    return this.brume.myNightActionSubmitted() ? 'Ton choix est envoyé.' : 'Choisis ton action avant la fin du minuteur.';
  });

  protected readonly resultStageLabels = RESULT_STAGE_LABELS;
  protected readonly roleRows = computed(() => {
    const results = this.brume.results();
    if (!results) return [];
    return Object.entries(results.roles).map(([id, info]) => ({
      id,
      pseudo: info.pseudo,
      champion: this.championName(info.role),
      teamLabel: BRUME_TEAM_LABELS[info.team],
      alive: info.alive,
    }));
  });
  protected readonly scoreRows = computed(() => {
    const results = this.brume.results();
    if (!results) return [];
    return Object.entries(results.roles)
      .map(([id, info]) => ({ id, pseudo: info.pseudo, points: results.scores[id] ?? 0 }))
      .sort((a, b) => b.points - a.points);
  });

  constructor(
    protected readonly room: RoomService,
    protected readonly mix: MixRuntimeService,
    protected readonly brume: BrumeService,
  ) {
    const ticker = setInterval(() => this.now.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => clearInterval(ticker));
    // Toujours se resynchroniser au montage : les events one-shot (START,
    // REVEAL, NIGHT_STARTED...) peuvent avoir ete emis avant que ce composant
    // n'existe.
    this.brume.requestState();

    // Grosse annonce dramatique a chaque nouvelle aube / resultat de vote,
    // en plus du recap discret deja affiche dans le fil du jour.
    effect(() => {
      const dawn = this.brume.lastDawn();
      if (dawn && dawn !== this.seenDawn) {
        this.seenDawn = dawn;
        this.dawnAnnounce.set(dawn);
        setTimeout(() => this.dawnAnnounce.set(null), 5000);
      }
    });
    effect(() => {
      const vr = this.brume.voteResult();
      if (vr && vr !== this.seenVote) {
        this.seenVote = vr;
        this.voteAnnounce.set(vr);
        setTimeout(() => this.voteAnnounce.set(null), 4200);
      }
    });

    // Auto-scroll des fils de chat vers le bas a chaque nouveau message.
    // afterRenderEffect (pas requestAnimationFrame) : declenche par le pipeline
    // de rendu d'Angular une fois le DOM reellement a jour, contrairement a rAF
    // qui peut etre suspendu si l'onglet n'est pas au premier plan.
    afterRenderEffect(() => {
      this.brume.packChat();
      this.scrollToBottom(this.packFeedRef());
    });
    afterRenderEffect(() => {
      this.brume.dayChat();
      this.scrollToBottom(this.dayFeedRef());
    });
  }

  private scrollToBottom(ref: ElementRef<HTMLDivElement> | undefined): void {
    if (!ref) return;
    const el = ref.nativeElement;
    el.scrollTop = el.scrollHeight;
    // Filet de securite : si plusieurs messages arrivent quasi simultanement
    // (rafale), une deuxieme passe corrige un scrollHeight mesure trop tot.
    setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 60);
  }

  private myPseudo(): string | undefined {
    return this.brume.players().find((p) => p.id === this.room.myId())?.pseudo;
  }

  portraitUrl(champion: string): string {
    return championLoadingUrl(champion);
  }

  /** Poro n'est pas un champion jouable : Data Dragon n'a pas de portrait pour lui. */
  isPoro(champion: string): boolean {
    return champion === 'Poro';
  }

  private championName(role: string): string {
    return ({
      warwick: 'Warwick',
      fiddlesticks: 'Fiddlesticks',
      thresh: 'Thresh',
      ashe: 'Ashe',
      poro: 'Poro',
      kindred: 'Kindred',
    } as Record<string, string>)[role] ?? role;
  }

  protected teamLabel(): string {
    const team = this.brume.myTeam();
    return team ? BRUME_TEAM_LABELS[team] : '';
  }

  /** Indicateur visuel demande cote produit : nom du champion pour un coequipier "mechant" (voir brume.myTeammates()). */
  protected roleLabelFor(role: BrumeRole): string {
    return BRUME_ROLE_LABELS[role];
  }

  /** Bouton toujours visible en dehors du reveal initial : pratique pour les streamers/joueurs distraits qui veulent revoir leur role sans le laisser affiche en permanence a l'ecran. */
  protected readonly roleReminderOpen = signal(false);
  toggleRoleReminder(): void {
    this.roleReminderOpen.update((open) => !open);
  }

  /** Glossaire des roles du mode (panneau lateral) : liste fixe, ne reflete pas le tirage exact de cette manche. */
  protected readonly roleLegend = ROLE_LEGEND_ORDER.map((role) => ({
    role,
    label: BRUME_ROLE_LABELS[role],
    ...BRUME_ROLE_META[role],
  }));
  protected readonly openRoleInfo = signal<BrumeRole | null>(null);
  openRoleDetail(role: BrumeRole): void {
    this.openRoleInfo.set(role);
  }
  closeRoleDetail(): void {
    this.openRoleInfo.set(null);
  }
  protected teamLabelFor(team: 'predators' | 'circle' | 'solo'): string {
    return BRUME_TEAM_LABELS[team];
  }

  dawnTitle(dawn: BrumeNightRecap): string {
    if (!dawn.deaths.length) return "Personne n'a été touché cette nuit";
    const names = dawn.deaths.map((d) => d.pseudo).join(' et ');
    return dawn.deaths.length > 1 ? `${names} ont disparu dans la Brume` : `${names} a disparu dans la Brume`;
  }

  confettiColor(i: number): string {
    return CONFETTI_COLORS[i % CONFETTI_COLORS.length];
  }

  votersFor(targetId: string): string[] {
    const votes = this.brume.voteProgress()?.votes ?? {};
    return Object.entries(votes)
      .filter(([, target]) => target === targetId)
      .map(([voterId]) => this.brume.players().find((p) => p.id === voterId)?.pseudo ?? '?');
  }

  /** Un joueur peut changer d'avis autant de fois qu'il veut tant que la nuit n'est pas resolue (voir demande produit) : plus de verrou sur myNightActionSubmitted() ici. */
  submitAction(action: 'hunt'): void {
    this.brume.submitNightAction(action);
  }

  submitTargetedAction(action: 'consommer' | 'effroi' | 'mark_fiddlesticks' | 'protect' | 'scout' | 'huddle' | 'mark_kindred'): void {
    const target = this.selectedTarget();
    if (!target) return;
    this.brume.submitNightAction(action, target);
  }

  sendPack(): void {
    if (!this.packInput.trim()) return;
    this.brume.sendChat('pack', this.packInput);
    this.packInput = '';
  }

  sendAssembly(): void {
    if (!this.assemblyInput.trim()) return;
    this.brume.sendChat('assembly', this.assemblyInput);
    this.assemblyInput = '';
  }

  sendReaction(channel: BrumeChatChannel, emoji: string): void {
    this.brume.sendChat(channel, emoji);
  }

  winnerTitle(winner: 'predators' | 'circle' | 'kindred'): string {
    if (winner === 'predators') return 'LES PRÉDATEURS GAGNENT';
    if (winner === 'circle') return 'LE CERCLE GAGNE';
    return 'KINDRED GAGNE SEUL';
  }

  nextResultStage(): void {
    if (this.resultStage() >= 1) return;
    this.resultStage.update((s) => s + 1);
    if (this.resultStage() === 1) this.submitMix();
  }

  private submitMix(): void {
    if (!this.mix.active() || this.submittedToMix()) return;
    this.submittedToMix.set(true);
    const results = this.brume.results();
    if (!results) return;
    const points = results.scores[this.room.myId() ?? ''] ?? 0;
    this.room.submitMixSegment(points, results.summary);
  }
}
