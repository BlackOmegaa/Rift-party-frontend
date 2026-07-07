import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../core/services/room.service';
import { MixRuntimeService } from '../../core/services/mix-runtime.service';
import { LoldleService } from '../../core/services/loldle.service';
import { ChampionSelectComponent } from '../../shared/components/champion-select/champion-select.component';
import { CHAMPION_OPTIONS, championLoadingUrl } from '../../shared/lol-assets';
import { LoldleGuessRow, LoldleLetterState } from '../../core/models/loldle.model';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AudioService } from '../../core/services/audio.service';
import { animateEndScreen } from '../../shared/end-screen-animate';
import { burstParticles, punchIn, shake, slideUp } from '../../shared/cinematic/cinematic';

/** Ne garde que les lettres, en majuscules : aligne l'affichage des cases avec le feedback du serveur. */
function lettersOf(name: string): string[] {
  return name.toUpperCase().replace(/[^A-Z]/g, '').split('');
}

@Component({
  selector: 'app-loldle',
  standalone: true,
  imports: [FormsModule, ChampionSelectComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loldle.component.html',
  styleUrl: './loldle.component.scss',
})
export class LoldleComponent {
  protected guessInput = '';
  protected readonly submittedToMix = signal(false);
  private readonly now = signal(Date.now());
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  private lastRowCount = 0;
  /** Timeouts du flip lettre par lettre : purges a la destruction pour ne pas jouer de sons/DOM fantomes en Party Mix. */
  private revealTimeouts: ReturnType<typeof setTimeout>[] = [];

  protected readonly championOptions = CHAMPION_OPTIONS;

  protected readonly filteredChampionOptions = computed(() => {
    const len = this.loldle.wordLength();
    if (!len) return this.championOptions;
    return this.championOptions.filter((c) => lettersOf(c.name).length === len);
  });

  protected readonly remainingSeconds = computed(() => {
    const deadline = this.loldle.phaseDeadline();
    if (!deadline) return 0;
    return Math.max(0, Math.ceil((deadline - this.now()) / 1000));
  });

  protected readonly blankRowsCount = computed(() =>
    Math.max(0, this.loldle.maxGuesses() - this.loldle.myRows().length),
  );

  /** Lignes vides APRES la ligne "en cours" (celle-ci est affichee separement quand je peux encore jouer). */
  protected readonly blankTrailingRowsCount = computed(() =>
    Math.max(0, this.blankRowsCount() - (this.loldle.myDone() ? 0 : 1)),
  );

  protected readonly scoreRows = computed(() => {
    const results = this.loldle.results();
    if (!results) return [];
    return [...results.rows].sort((a, b) => b.points - a.points);
  });

  /** Pilote l'overlay de verdict cinematique une fois que je n'ai plus d'essai / que j'ai trouve. */
  protected readonly verdict = computed<'correct' | 'wrong' | null>(() => {
    if (!this.loldle.myDone()) return null;
    return this.loldle.mySolved() ? 'correct' : 'wrong';
  });

  /**
   * Statut courant de chaque AUTRE joueur (moi = deja visible via ma propre
   * grille) : derive du feed (liste d'evenements "essai N") en ne gardant que
   * le dernier essai connu par joueur. Remplace l'ancien "fil de la manche"
   * (log brut qui defilait tout en bas, hors ecran) par un message clair par
   * joueur, affichable dans les marges gauche/droite de la grille.
   */
  protected readonly otherPlayersStatus = computed(() => {
    const myId = this.room.myId();
    const lastByPlayer = new Map<string, { attemptNumber: number; solved: boolean }>();
    for (const entry of this.loldle.feed()) {
      const existing = lastByPlayer.get(entry.playerId);
      if (!existing || entry.attemptNumber > existing.attemptNumber) {
        lastByPlayer.set(entry.playerId, { attemptNumber: entry.attemptNumber, solved: entry.solved });
      }
    }
    const maxGuesses = this.loldle.maxGuesses();
    return this.room
      .players()
      .filter((p) => p.id !== myId)
      .map((p) => {
        const last = lastByPlayer.get(p.id);
        const failed = !!last && !last.solved && last.attemptNumber >= maxGuesses;
        const solved = !!last?.solved;
        const message = solved
          ? `A trouvé en ${last!.attemptNumber} essai${last!.attemptNumber > 1 ? 's' : ''} !`
          : failed
            ? "N'a pas trouvé"
            : last
              ? `Essai ${last.attemptNumber}/${maxGuesses}`
              : "N'a pas encore commencé";
        return { playerId: p.id, pseudo: p.pseudo, solved, failed, message };
      });
  });


  constructor(
    protected readonly room: RoomService,
    protected readonly mix: MixRuntimeService,
    protected readonly loldle: LoldleService,
    private readonly audio: AudioService,
  ) {
    const ticker = setInterval(() => this.now.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(ticker);
      this.revealTimeouts.forEach((id) => clearTimeout(id));
      this.revealTimeouts = [];
    });
    // Toujours se resynchroniser au montage : les events one-shot (START,
    // GUESS_RESULT...) peuvent avoir ete emis avant que ce composant n'existe.
    this.loldle.requestState();
    // Entree animee de la scene (grille qui punch, barre d'action qui glisse).
    requestAnimationFrame(() => {
      const host = this.hostElement.nativeElement;
      punchIn(host.querySelector('.grid-zone'));
      slideUp(host.querySelector('.action-bar'), { delay: 0.1 });
      slideUp(host.querySelector('.side-panel'), { delay: 0.16 });
    });
    effect(() => {
      if (this.loldle.results()) this.submitMix();
    });
    // Battement sourd sur les 5 dernieres secondes du timer, tant que je joue encore.
    effect(() => {
      const secondsLeft = this.remainingSeconds();
      if (this.loldle.phase() === 'guessing' && !this.loldle.myDone() && secondsLeft > 0 && secondsLeft <= 5) {
        this.audio.play('timer-urgent', { volume: 0.7 });
      }
    });
    // Anime chaque nouvelle ligne revelee (flip/pop lettre par lettre + son selon le resultat).
    effect(() => {
      const rows = this.loldle.myRows();
      if (rows.length <= this.lastRowCount) {
        this.lastRowCount = rows.length;
        return;
      }
      const newRowIndex = rows.length - 1;
      this.lastRowCount = rows.length;
      requestAnimationFrame(() => this.animateRevealedRow(newRowIndex, rows[newRowIndex]));
    });
    // Verdict final (trouve / pas trouve) : traitement cinematique + particules si gagne.
    effect(() => {
      const v = this.verdict();
      if (!v) return;
      const host = this.hostElement.nativeElement;
      requestAnimationFrame(() => {
        const stage = host.querySelector('.cine-stage') as HTMLElement | null;
        punchIn(host.querySelector('.verdict'));
        if (v === 'correct') {
          this.audio.play('correct');
          burstParticles(stage, { colors: ['#3fd67a', '#c8aa6e', '#f0e6d2'], count: 40 });
        } else {
          this.audio.play('wrong');
          shake(stage);
        }
      });
    });
    // Entree de l'ecran de resultats final (grille + scores en stagger, fanfare si mix termine).
    effect(() => {
      if (this.loldle.phase() !== 'results') return;
      this.audio.play('fanfare');
      const host = this.hostElement.nativeElement;
      requestAnimationFrame(() => {
        animateEndScreen(host, {
          onCountTick: () => this.audio.play('score-tick', { volume: 0.4 }),
        });
        burstParticles(host.querySelector('.results-stage'), { count: 36 });
      });
    });
  }

  /** Anime la ligne qui vient d'etre revelee : flip case par case + son par couleur de resultat. */
  private animateRevealedRow(rowIndex: number, row: LoldleGuessRow): void {
    const host = this.hostElement.nativeElement;
    const rowEl = host.querySelectorAll('.grid-row')[rowIndex] as HTMLElement | undefined;
    if (!rowEl) return;
    const cells = Array.from(rowEl.querySelectorAll('.cell')) as HTMLElement[];
    cells.forEach((cell, i) => {
      const state = row.feedback[i];
      this.revealTimeouts.push(
        setTimeout(() => {
          cell.classList.add('flip');
          if (state === 'correct') this.audio.play('correct', { volume: 0.55 });
          else if (state === 'present') this.audio.play('hint', { volume: 0.55 });
          else this.audio.play('ui-click', { volume: 0.35 });
        }, i * 160),
      );
    });
  }

  cellsFor(row: LoldleGuessRow): { letter: string; state: LoldleLetterState }[] {
    const letters = lettersOf(row.name);
    return row.feedback.map((state, i) => ({ letter: letters[i] ?? '', state }));
  }

  blankCells(): number[] {
    return Array.from({ length: this.loldle.wordLength() || 5 }, (_, i) => i);
  }

  blankRows(): number[] {
    return Array.from({ length: this.blankTrailingRowsCount() }, (_, i) => i);
  }

  portraitUrl(champion: string): string {
    return championLoadingUrl(champion);
  }

  submitGuess(): void {
    const name = this.guessInput.trim();
    if (!name || this.loldle.myDone()) return;
    this.audio.play('ui-click', { volume: 0.5 });
    this.loldle.submitGuess(name);
    this.guessInput = '';
  }

  private submitMix(): void {
    if (!this.mix.active() || this.submittedToMix()) return;
    this.submittedToMix.set(true);
    const results = this.loldle.results();
    if (!results) return;
    const points = results.scores[this.room.myId() ?? ''] ?? 0;
    this.room.submitMixSegment(points, results.summary);
  }
}
