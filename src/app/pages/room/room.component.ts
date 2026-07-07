import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, isDevMode, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RoomService } from '../../core/services/room.service';
import { PlayerAuthService } from '../../core/services/player-auth.service';
import { GamesService } from '../../core/services/games.service';
import { PlayerBadgeComponent } from '../../shared/components/player-badge/player-badge.component';
import { MINI_GAME_COMPONENTS } from '../../mini-games/mini-games.registry';
import { MiniGame, Room } from '../../core/models/room.model';
import { Player } from '../../core/models/player.model';
import { GameSettingsService } from '../../core/services/game-settings.service';
import { DevBotsService } from '../../core/services/dev-bots.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';
import { MixRuntimeService } from '../../core/services/mix-runtime.service';
import { AudioService } from '../../core/services/audio.service';
import { SoundToggleComponent } from '../../shared/components/sound-toggle/sound-toggle.component';
import { SupportBannerComponent } from '../../shared/components/support-banner/support-banner.component';
import { SupporterOfferService } from '../../core/services/supporter-offer.service';
import { AdSlotComponent } from '../../shared/components/ad-slot/ad-slot.component';
import { burstParticles, countUp, punchIn, slideUp } from '../../shared/cinematic/cinematic';

interface GameSettings {
  rounds: number;
  included: Record<string, boolean>;
}

/** Jeux dont la progression (scores en direct) est deja diffusee a toute la room via party:segment-progress, meme hors Party Mix (voir Tier 1). Les autres jeux (draft/undercover/brume/loldle) gerent leur propre etat et ne peuvent pas encore etre suivis en direct par un spectateur. */
const SPECTATABLE_GAMES = new Set([
  'guess-champion',
  'fusion-champions',
  'turret-tank',
  'tiktok-ranking',
  'intrus',
]);

/** Petits jeux express : parties courtes, alternees avec un gros jeu en Party Mix. */
const SMALL_GAMES = new Set(['guess-champion', 'loldle', 'fusion-champions', 'turret-tank', 'intrus']);
/** Gros jeux : setup plus long (draft, classement, deduction sociale...). */
const BIG_GAMES = ['tiktok-ranking', 'undercover-champion', 'draft-battle', 'brume', 'vote-party', 'last-survivor'];

interface RoundIntro {
  gameId: string;
  label: string;
  description: string;
  accent: string;
  isSmall: boolean;
  phase: 'title' | 'countdown';
}

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [NgComponentOutlet, PlayerBadgeComponent, IconComponent, SoundToggleComponent, SupportBannerComponent, RouterLink, AdSlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room.component.html',
  styleUrl: './room.component.scss',
})

export class RoomComponent implements OnDestroy {
  protected readonly router = inject(Router);
  private readonly gamesService = inject(GamesService);
  protected readonly games = signal<MiniGame[]>([]);
  protected readonly settingsGameId = signal<string | null>(null);
  /** Mode dev : force un event Draft Battle special au lieu du tirage aleatoire (~10% de chances en temps normal), pour pouvoir le tester a volonte. 'none' = valeur par defaut (tirage normal). */
  protected readonly forcedDraftEvent = signal(localStorage.getItem('rift-party-force-event-dev') ?? 'none');
  protected readonly settings = signal<GameSettings>({
    rounds: Math.min(10, Number(localStorage.getItem('rift-party-rounds') ?? 10)),
    included: JSON.parse(localStorage.getItem('rift-party-included') ?? '{}') as Record<string, boolean>,
  });

  protected readonly copiedCode = signal(false);
  protected readonly copiedInvite = signal(false);
  protected readonly isDevMode = isDevMode;

  /** Ecran cinematique affiche en debut de manche : carte-titre puis countdown 3-2-1-GO. */
  protected readonly roundIntro = signal<RoundIntro | null>(null);
  /** 3, 2, 1 puis 0 = "GO !". */
  protected readonly countdownValue = signal(3);
  private introTimers: ReturnType<typeof setTimeout>[] = [];
  private introKey: string | null = null;
  private supporterToastTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly hostElement = inject(ElementRef<HTMLElement>);
  /** Detecte les transitions (pas juste la presence) des ecrans de resultats, pour ne jouer le fanfare/particles qu'une fois par apparition. */
  private lastRoomStatus: string | null = null;

  constructor(
    protected readonly room: RoomService,
    protected readonly gameSettings: GameSettingsService,
    protected readonly devBots: DevBotsService,
    protected readonly mix: MixRuntimeService,
    protected readonly audio: AudioService,
    protected readonly playerAuth: PlayerAuthService,
    private readonly supporterOffer: SupporterOfferService,
  ) {
    this.gamesService.list().subscribe((games) => this.games.set(games));

    // Reload en pleine partie : le signal room() repart a null (nouvelle instance de service),
    // on tente de rejoindre automatiquement la room de l'URL plutot que d'afficher "Aucune room active".
    const code = inject(ActivatedRoute).snapshot.paramMap.get('code');
    if (code && !this.room.room()) this.room.tryRejoin(code);

    effect(() => {
      const gameId = this.room.lastGameStarted();
      const mixState = this.room.room()?.activeMix;
      if (!gameId || !mixState || mixState.status !== 'running') return;
      // `startedAt` distingue deux Party Mix successifs meme si le cursor/gameId du round 1 coincident par hasard.
      const key = `${mixState.startedAt}:${mixState.cursor}:${gameId}`;
      if (key === this.introKey) return;
      this.introKey = key;
      this.triggerRoundIntro(gameId);
    });

    // Bande-son orchestree par l'etat de la room : tension pendant les manches, nappe ambient partout ailleurs.
    effect(() => {
      const currentRoom = this.room.room();
      if (!currentRoom) {
        this.audio.stopMusic();
        return;
      }
      const inGame = currentRoom.status === 'in-game' && !!currentRoom.currentGameId;
      this.audio.playMusic(inGame ? 'tension' : 'ambient');
    });

    // Ecrans de resultats (bilan de manche / Rift Report final) : mise en scene
    // (son + particules) jouee une seule fois a l'apparition de chaque ecran,
    // pas a chaque recalcul (le signal room() change aussi pour des raisons
    // sans rapport, ex. un joueur qui rejoint entre deux manches).
    effect(() => {
      const currentRoom = this.room.room();
      const status = currentRoom
        ? currentRoom.activeMix?.status === 'finished' || currentRoom.status === 'finished'
          ? 'finished'
          : currentRoom.activeMix?.status === 'between-rounds'
            ? 'between-rounds'
            : null
        : null;
      if (status === this.lastRoomStatus) return;
      this.lastRoomStatus = status;
      if (!status) return;
      const host = this.hostElement.nativeElement;
      requestAnimationFrame(() => {
        if (status === 'finished') {
          this.audio.play('fanfare');
          const scoreEl = host.querySelector('.rift-report [data-count-up]') as HTMLElement | null;
          if (scoreEl) countUp(scoreEl, Number(scoreEl.textContent?.trim() ?? 0), { duration: 1.3 });
          const firstBlock = host.querySelector('.podium-top .podium-block.first');
          punchIn(firstBlock);
          slideUp(host.querySelector('.podium-top .podium-block.second'), { delay: 0.1 });
          slideUp(host.querySelector('.podium-top .podium-block.third'), { delay: 0.16 });
          burstParticles(host.querySelector('.rift-report'), { count: 46, colors: ['#c8aa6e', '#f0e6d2', '#3fd67a'] });
          // "Victoire doree" : le vainqueur (1ere place) est abonne -> burst
          // supplementaire cible sur son bloc de podium, visible par toute la
          // room. Purement cosmetique, aucun impact sur le classement/score.
          if (this.room.sortedByScore()[0]?.isSubscriber) {
            burstParticles(firstBlock as HTMLElement | null, { count: 30, colors: ['#c8aa6e', '#f0e6d2'] });
          }
          // Laisse la cinematique de victoire respirer avant de proposer l'offre.
          setTimeout(() => this.supporterOffer.open(), 2600);
        } else {
          this.audio.play('round-win', { volume: 0.7 });
          const leader = host.querySelector('.mix-resume .rank-card.leader') as HTMLElement | null;
          if (leader) burstParticles(leader, { count: 20, colors: ['#c8aa6e', '#f0e6d2'] });
        }
      });
    });

    // "Entree Supporter" : un abonne rejoint la room, burst dore + toast
    // visibles par tout le monde (voir RoomService.justJoinedSupporter,
    // alimente par l'event PLAYER_JOINED que le backend n'emet jamais a
    // soi-meme - donc jamais declenche pour sa propre arrivee).
    effect(() => {
      const supporter = this.room.justJoinedSupporter();
      if (!supporter) return;
      const host = this.hostElement.nativeElement;
      requestAnimationFrame(() => {
        burstParticles(host.querySelector('.players'), { count: 22, colors: ['#c8aa6e', '#f0e6d2'] });
        this.audio.play('reveal', { volume: 0.6 });
      });
      if (this.supporterToastTimer) clearTimeout(this.supporterToastTimer);
      this.supporterToastTimer = setTimeout(() => this.room.clearJustJoinedSupporter(), 3200);
    });
  }

  ngOnDestroy(): void {
    this.clearIntroTimers();
    if (this.supporterToastTimer) clearTimeout(this.supporterToastTimer);
    this.audio.stopMusic();
  }

  private clearIntroTimers(): void {
    this.introTimers.forEach((t) => clearTimeout(t));
    this.introTimers = [];
  }

  /** Sequence cinematique de debut de manche : carte-titre (whoosh + impact) puis countdown 3-2-1-GO sonorise. */
  private triggerRoundIntro(gameId: string): void {
    this.clearIntroTimers();
    const game = this.games().find((g) => g.id === gameId);
    const isSmall = SMALL_GAMES.has(gameId);
    const base = { gameId, label: game?.label ?? gameId, description: game?.description ?? '', accent: this.accentFor(gameId), isSmall };
    const titleMs = isSmall ? 2800 : 3600;

    this.roundIntro.set({ ...base, phase: 'title' });
    this.audio.play('whoosh');
    this.introTimers.push(setTimeout(() => this.audio.play('impact'), 220));

    this.introTimers.push(
      setTimeout(() => {
        this.roundIntro.set({ ...base, phase: 'countdown' });
        this.countdownValue.set(3);
        this.audio.play('countdown-tick');
        for (const step of [2, 1, 0]) {
          this.introTimers.push(
            setTimeout(() => {
              this.countdownValue.set(step);
              if (step === 0) this.audio.play('countdown-go');
              else this.audio.play('countdown-tick', { rate: step === 1 ? 1.12 : 1 });
            }, (3 - step) * 750),
          );
        }
        this.introTimers.push(setTimeout(() => this.roundIntro.set(null), 3 * 750 + 700));
      }, titleMs),
    );
  }

  spectateSupported(gameId: string | null): boolean {
    return !!gameId && SPECTATABLE_GAMES.has(gameId);
  }

  /** Mode cinema : pendant une manche jouee, la sidebar disparait pour laisser tout l'ecran au jeu. */
  cinematicMode(currentRoom: Room): boolean {
    return currentRoom.status === 'in-game' && !!currentRoom.currentGameId && !this.room.joinedMidGame();
  }

  spectateRows() {
    const scores = this.mix.progress()?.scores;
    if (!scores?.length) return null;
    return [...scores].sort((a, b) => b.points - a.points);
  }

  fillWithBots(target: number): void {
    const currentRoom = this.room.room();
    if (!currentRoom) return;
    const need = Math.max(0, target - currentRoom.players.length);
    if (need === 0) return;
    this.devBots.fillRoom(currentRoom.code, need, currentRoom.players.length);
  }

  setForcedDraftEvent(value: string): void {
    localStorage.setItem('rift-party-force-event-dev', value);
    this.forcedDraftEvent.set(value);
  }

  /** Lance un mini-jeu depuis la grille : passe l'event force pour Draft Battle si le controle dev en a un de selectionne. 'none' (= Normal/aleatoire) doit rester undefined cote backend pour laisser le tirage ~10% s'executer, sinon il force explicitement l'absence d'event. */
  launchGame(gameId: string): void {
    const forced = gameId === 'draft-battle' ? this.forcedDraftEvent() : undefined;
    this.room.startGame(gameId, forced === 'none' ? undefined : forced);
  }

  removeBots(): void {
    this.devBots.reset();
  }

  partyMix() { return this.games().find((g) => g.id === 'party-mix'); }
  /**
   * Filtre aussi les modes `beta` (acces anticipe) tant qu'aucun abonne
   * Supporter n'est present dans la room - meme logique communautaire que le
   * contenu premium TikTok Ranking : un abonne "debloque" pour tout le
   * groupe, il ne joue jamais seul dans son coin.
   */
  secondaryGames() {
    const hasSupporter = this.room.players().some((p) => p.isSubscriber);
    return this.games().filter((g) => g.id !== 'party-mix' && (!g.beta || hasSupporter));
  }
  componentFor(gameId: string) { return MINI_GAME_COMPONENTS[gameId] ?? null; }
  iconFor(gameId: string): IconName { return ({ 'party-mix': 'sparkle', 'draft-battle': 'sword', 'guess-champion': 'question', 'fusion-champions': 'flask', 'turret-tank': 'tower', 'tiktok-ranking': 'list', 'whos-inting': 'skull', 'undercover-champion': 'mask', 'brume': 'fog', 'loldle': 'letters', 'intrus': 'search', 'vote-party': 'scale', 'last-survivor': 'crown', 'qui-suis-je': 'eye', 'croquis': 'brush' } as Record<string, IconName>)[gameId] ?? 'sparkle'; }
  accentFor(gameId?: string | null): string { return ({ 'party-mix': '#c8aa6e', 'draft-battle': '#c8aa6e', 'guess-champion': '#0ac8b9', 'fusion-champions': '#b673ff', 'turret-tank': '#ffb347', 'tiktok-ranking': '#ff4fd8', 'whos-inting': '#c13c4d', 'undercover-champion': '#6c5ce7', 'brume': '#c13c4d', 'loldle': '#3fd67a', 'intrus': '#e0a94a', 'vote-party': '#ff4fd8', 'last-survivor': '#c13c4d', 'qui-suis-je': '#0ac8b9', 'croquis': '#b673ff' } as Record<string, string>)[gameId ?? ''] ?? '#c8aa6e'; }
  labelFor(gameId?: string | null): string { return this.games().find((g) => g.id === gameId)?.label ?? (gameId || 'Mini-jeu'); }
  openSettings(gameId: string) { this.settingsGameId.set(gameId); }
  closeSettings() { this.settingsGameId.set(null); }

  startMix(): void { this.room.startMix(this.buildPlaylist()); }

  /** Construit la playlist en alternant un gros jeu et un petit jeu, sans jamais rejouer deux fois le meme jeu. */
  buildPlaylist(): string[] {
    const included = this.settings().included;
    const minPlayersFor = (id: string) => this.games().find((g) => g.id === id)?.minPlayers ?? 1;
    const registeredIds = new Set(this.secondaryGames().map((g) => g.id));
    const isPlayable = (id: string) => registeredIds.has(id) && included[id] !== false && this.room.players().length >= minPlayersFor(id);

    const shuffle = <T,>(arr: T[]): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    let bigPool = BIG_GAMES.filter(isPlayable);
    let smallPool = [...SMALL_GAMES].filter(isPlayable);
    if (!bigPool.length && !smallPool.length) {
      bigPool = BIG_GAMES.filter((id) => registeredIds.has(id));
      smallPool = [...SMALL_GAMES].filter((id) => registeredIds.has(id));
    }

    const bigQueue = shuffle(bigPool);
    const smallQueue = shuffle(smallPool);
    const target = Math.max(5, this.settings().rounds);
    const playlist: string[] = [];

    // Pas assez de joueurs pour aucun gros jeu (ou aucun petit jeu actif) : pas d'alternance possible, on joue juste ce qui est disponible.
    if (!bigQueue.length || !smallQueue.length) {
      const solo = bigQueue.length ? bigQueue : smallQueue;
      while (playlist.length < target && solo.length) playlist.push(solo.shift()!);
      return playlist;
    }

    // Alternance stricte gros/petit/gros/petit... : on s'arrete des qu'une categorie est epuisee plutot que d'enchainer plusieurs petits jeux d'affilee.
    let turn: 'big' | 'small' = 'big';
    while (playlist.length < target) {
      const queue = turn === 'big' ? bigQueue : smallQueue;
      if (!queue.length) break;
      playlist.push(queue.shift()!);
      turn = turn === 'big' ? 'small' : 'big';
    }
    return playlist;
  }

  mixTaunt(currentRoom: Room): string {
    const players = this.room.sortedByScore();
    const first = players[0]?.pseudo ?? 'Quelqu un';
    const last = players[players.length - 1]?.pseudo ?? 'Benson';
    const lastRound = currentRoom.roundHistory[currentRoom.roundHistory.length - 1];
    if (lastRound) {
      const zeros = Object.entries(lastRound.scores).filter(([, score]) => score <= 0);
      if (zeros.length) return `${this.nameOf(zeros[0][0])} fait son downfall, mais la remontada reste mathematiquement possible.`;
      const winner = Object.entries(lastRound.scores).sort((a, b) => b[1] - a[1])[0];
      if (winner) return `${this.nameOf(winner[0])} vient de prendre +${winner[1]}, le lobby est sous pression.`;
    }
    return `${first} commence a prendre trop la confiance pendant que ${last} observe le bas du classement.`;
  }

  lastDelta(currentRoom: Room, playerId: string): number {
    return currentRoom.roundHistory[currentRoom.roundHistory.length - 1]?.scores[playerId] ?? 0;
  }

  nameOf(playerId: string): string { return this.room.players().find((p) => p.id === playerId)?.pseudo ?? 'Quelqu un'; }
  winnerName(): string { return this.room.sortedByScore()[0]?.pseudo ?? 'Personne'; }
  cursedPlayer(): string { const players = this.room.sortedByScore(); return players[players.length - 1]?.pseudo ?? 'Benson'; }
  communityBrain(): string { return this.room.sortedByScore()[1]?.pseudo ?? this.winnerName(); }
  worstTake(currentRoom: Room): string { return currentRoom.roundHistory.find((r) => r.summary.includes('downfall'))?.summary ?? 'Aucune take assez maudite, suspicious.'; }


  /** Podium (top 3, ordre visuel 2-1-3 pour le rendu en marches) et le reste du classement, pour le Rift Report final. */
  podiumOrder(): { player: Player; place: 1 | 2 | 3 }[] {
    const top = this.room.sortedByScore().slice(0, 3);
    return [
      top[1] ? { player: top[1], place: 2 as const } : null,
      top[0] ? { player: top[0], place: 1 as const } : null,
      top[2] ? { player: top[2], place: 3 as const } : null,
    ].filter((x): x is NonNullable<typeof x> => !!x);
  }
  restRanking(): Player[] { return this.room.sortedByScore().slice(3); }

  lastRound(currentRoom: Room) { return currentRoom.roundHistory[currentRoom.roundHistory.length - 1] ?? null; }
  intermissionTitle(currentRoom: Room): string {
    const round = this.lastRound(currentRoom);
    if (!round) return 'La partie commence';
    const winner = Object.entries(round.scores).sort((a, b) => b[1] - a[1])[0];
    return winner ? `${this.nameOf(winner[0])} prend +${winner[1]}` : 'Manche terminee';
  }
  previousSorted(currentRoom: Room) {
    const round = this.lastRound(currentRoom);
    return [...currentRoom.players].sort((a, b) => {
      const aBefore = a.score - (round?.scores[a.id] ?? 0);
      const bBefore = b.score - (round?.scores[b.id] ?? 0);
      return bBefore - aBefore;
    });
  }
  previousRank(currentRoom: Room, playerId: string): number { return this.previousSorted(currentRoom).findIndex((p) => p.id === playerId) + 1; }
  currentRank(playerId: string): number { return this.room.sortedByScore().findIndex((p) => p.id === playerId) + 1; }
  rankMovement(currentRoom: Room, playerId: string): number {
    const before = this.previousRank(currentRoom, playerId);
    const now = this.currentRank(playerId);
    return before && now ? before - now : 0;
  }
  movementLabel(currentRoom: Room, playerId: string): string {
    const delta = this.lastDelta(currentRoom, playerId);
    const move = this.rankMovement(currentRoom, playerId);
    const name = this.nameOf(playerId);
    if (move >= 2) return `Grosse montée : +${move} places, ${name} se réveille.`;
    if (move === 1) return `+1 place, remontada propre.`;
    if (move <= -2) return `Downfall violent : ${Math.abs(move)} places perdues.`;
    if (move === -1) return `-1 place, attention au mental.`;
    if (delta <= 0) return `+0 point. Faites un effort.`;
    if (delta >= 25 && this.currentRank(playerId) !== 1) return `Perfect mais le top 1 reste loin.`;
    if (delta >= 20) return `Très grosse manche.`;
    return `Classement stable, +${delta} pts.`;
  }
  tiktokCards(currentRoom: Room): string[] { return this.lastRound(currentRoom)?.details?.cards ?? []; }
  tiktokTop(currentRoom: Room, slot: number): string { return this.lastRound(currentRoom)?.details?.lobbyTop?.find((entry: any) => entry.slot === slot)?.champion ?? 'Yasuo'; }
  tiktokCommunityTop(currentRoom: Room): string { return this.lastRound(currentRoom)?.details?.cards?.find((line: string) => line.includes('Communaute'))?.split(': ')[1]?.split(' garde')[0] ?? 'Yasuo'; }
  finalPlayerTag(currentRoom: Room, playerId: string, index: number): string {
    if (index === 0) return 'Top 1 du lobby, ego validé.';
    const bestRound = currentRoom.roundHistory.reduce((best, round) => Math.max(best, round.scores[playerId] ?? 0), 0);
    if (bestRound <= 0) return 'A traversé la partie en mode spectateur.';
    if (bestRound >= 25) return `Meilleure manche : +${bestRound}.`;
    return `Meilleure manche : +${bestRound}, solide sans plus.`;
  }

  updateRoundTime(event: Event) { const value = Number((event.target as HTMLInputElement).value); this.gameSettings.setRoundTime(value); }
  updateRounds(event: Event) { const value = Math.min(10, Number((event.target as HTMLInputElement).value)); localStorage.setItem('rift-party-rounds', String(value)); this.settings.update((s) => ({ ...s, rounds: value })); }
  updateGameRounds(gameId: string, event: Event) { this.gameSettings.setRounds(gameId, Number((event.target as HTMLInputElement).value)); }
  updateLoldleWordLength(length: number | null): void { this.gameSettings.setLoldleWordLength(length); }
  toggleIncluded(gameId: string, event: Event) { const checked = (event.target as HTMLInputElement).checked; this.settings.update((s) => { const next = { ...s, included: { ...s.included, [gameId]: checked } }; localStorage.setItem('rift-party-included', JSON.stringify(next.included)); return next; }); }
  copyCode(code: string): void { navigator.clipboard?.writeText(code).catch(() => undefined); this.copiedCode.set(true); window.setTimeout(() => this.copiedCode.set(false), 1200); }
  /** Lien d'invitation direct : la home lit ?join=CODE et pre-remplit l'onglet Rejoindre. */
  copyInviteLink(code: string): void { navigator.clipboard?.writeText(`${window.location.origin}/?join=${code}`).catch(() => undefined); this.copiedInvite.set(true); this.room.notifyInviteGenerated(); window.setTimeout(() => this.copiedInvite.set(false), 1200); }
  leave(): void { this.room.leaveRoom(); this.router.navigate(['/']); }
}

