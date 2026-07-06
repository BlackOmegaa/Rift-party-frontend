import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';
import {
  BrumeChatChannel,
  BrumeChatMessage,
  BrumeNightActionType,
  BrumeNightRecap,
  BrumePhase,
  BrumePlayerRef,
  BrumeResult,
  BrumeRevealPayload,
  BrumeRole,
  BrumeSnapshot,
  BrumeTeam,
  BrumeTeammateRef,
  BrumeVoteProgress,
} from '../models/brume.model';

const BRUME_EVENTS = {
  START: 'brume:start',
  REVEAL: 'brume:reveal',
  REVEAL_READY: 'brume:reveal-ready',
  REVEAL_PROGRESS: 'brume:reveal-progress',
  NIGHT_STARTED: 'brume:night-started',
  NIGHT_ACTION: 'brume:night-action',
  NIGHT_PROGRESS: 'brume:night-progress',
  DAWN: 'brume:dawn',
  DAY_STARTED: 'brume:day-started',
  VOTE_STARTED: 'brume:vote-started',
  VOTE: 'brume:vote',
  VOTE_PROGRESS: 'brume:vote-progress',
  VOTE_RESULT: 'brume:vote-result',
  CHAT_SEND: 'brume:chat-send',
  CHAT_MESSAGE: 'brume:chat-message',
  RESULTS: 'brume:results',
  REQUEST_STATE: 'brume:request-state',
  STATE: 'brume:state',
} as const;

/**
 * Etat du mini-jeu "La Brume", en signals. Meme convention que
 * UndercoverService : le composant ne fait jamais de logique metier, il lit
 * ces signals et appelle les methodes d'action.
 */
@Injectable({ providedIn: 'root' })
export class BrumeService {
  private readonly _phase = signal<BrumePhase>('reveal');
  private readonly _dayNumber = signal(1);
  private readonly _players = signal<BrumePlayerRef[]>([]);
  private readonly _alivePlayerIds = signal<string[]>([]);
  private readonly _myRole = signal<BrumeRole | null>(null);
  private readonly _myTeam = signal<BrumeTeam | null>(null);
  private readonly _myChampion = signal<string | null>(null);
  private readonly _myKit = signal<string | null>(null);
  private readonly _myTeammates = signal<BrumeTeammateRef[]>([]);
  private readonly _revealReady = signal(false);
  private readonly _revealProgress = signal<{ ready: number; total: number } | null>(null);
  private readonly _phaseDeadline = signal<number | null>(null);
  private readonly _phaseDurationMs = signal(45_000);
  private readonly _myNightActionSubmitted = signal(false);
  private readonly _myFiddlesticksPending = signal(false);
  private readonly _myKindredMarqueId = signal<string | null>(null);
  private readonly _myKindredHuntStreak = signal(0);
  private readonly _myAsheClue = signal<{ targetId: string; targetPseudo: string; result: 'ombre' | 'clarte' } | null>(null);
  private readonly _lastDawn = signal<BrumeNightRecap | null>(null);
  private readonly _voteResult = signal<{ eliminatedId: string | null; eliminatedPseudo: string | null } | null>(null);
  private readonly _packChat = signal<BrumeChatMessage[]>([]);
  private readonly _dayChat = signal<BrumeChatMessage[]>([]);
  private readonly _myVote = signal<string | null>(null);
  private readonly _voteProgress = signal<BrumeVoteProgress | null>(null);
  private readonly _results = signal<BrumeResult | null>(null);

  readonly phase = this._phase.asReadonly();
  readonly dayNumber = this._dayNumber.asReadonly();
  readonly players = this._players.asReadonly();
  readonly alivePlayerIds = this._alivePlayerIds.asReadonly();
  readonly myRole = this._myRole.asReadonly();
  readonly myTeam = this._myTeam.asReadonly();
  readonly myChampion = this._myChampion.asReadonly();
  readonly myKit = this._myKit.asReadonly();
  readonly myTeammates = this._myTeammates.asReadonly();
  readonly revealReady = this._revealReady.asReadonly();
  readonly revealProgress = this._revealProgress.asReadonly();
  readonly phaseDeadline = this._phaseDeadline.asReadonly();
  readonly phaseDurationMs = this._phaseDurationMs.asReadonly();
  readonly myNightActionSubmitted = this._myNightActionSubmitted.asReadonly();
  readonly myFiddlesticksPending = this._myFiddlesticksPending.asReadonly();
  readonly myKindredMarqueId = this._myKindredMarqueId.asReadonly();
  readonly myKindredHuntStreak = this._myKindredHuntStreak.asReadonly();
  readonly myAsheClue = this._myAsheClue.asReadonly();
  readonly lastDawn = this._lastDawn.asReadonly();
  readonly voteResult = this._voteResult.asReadonly();
  readonly packChat = this._packChat.asReadonly();
  readonly dayChat = this._dayChat.asReadonly();
  readonly myVote = this._myVote.asReadonly();
  readonly voteProgress = this._voteProgress.asReadonly();
  readonly results = this._results.asReadonly();

  constructor(private readonly socket: SocketService) {
    this.socket.on<{ players: BrumePlayerRef[] }>(BRUME_EVENTS.START, (payload) => {
      this.reset();
      this._players.set(payload.players);
      this._alivePlayerIds.set(payload.players.map((p) => p.id));
      this._phase.set('reveal');
    });

    this.socket.on<BrumeRevealPayload>(BRUME_EVENTS.REVEAL, (payload) => {
      this._myRole.set(payload.role);
      this._myTeam.set(payload.team);
      this._myChampion.set(payload.champion);
      this._myKit.set(payload.kit);
      this._myTeammates.set(payload.teammates ?? []);
    });

    this.socket.on<{ ready: number; total: number }>(BRUME_EVENTS.REVEAL_PROGRESS, (payload) => {
      this._revealProgress.set(payload);
    });

    this.socket.on<{ deadline: number; durationMs: number; dayNumber: number }>(BRUME_EVENTS.NIGHT_STARTED, (payload) => {
      this._phase.set('night');
      this._dayNumber.set(payload.dayNumber);
      this._myNightActionSubmitted.set(false);
      // Ne pas reset voteResult ici : le petit recap de vote n'est de toute
      // facon affiche que pendant les phases day/vote (gate dans le template),
      // et un reset immediat courait le risque d'ecraser la valeur avant que
      // l'annonce dramatique du composant n'ait eu la chance de la lire (les
      // events VOTE_RESULT puis NIGHT_STARTED arrivent quasi simultanement).
      this._phaseDeadline.set(payload.deadline);
      this._phaseDurationMs.set(payload.durationMs);
    });

    this.socket.on<{ ready: number; total: number }>(BRUME_EVENTS.NIGHT_PROGRESS, () => {
      // Le detail (ready/total) n'est pas affiche cote nuit : chaque joueur ne
      // voit que son propre statut de soumission, jamais celui des autres roles.
    });

    this.socket.on<BrumeNightRecap>(BRUME_EVENTS.DAWN, (payload) => {
      this._lastDawn.set(payload);
      this._alivePlayerIds.update((ids) =>
        ids.filter((id) => !payload.deaths.some((d) => d.playerId === id)),
      );
    });

    this.socket.on<{ deadline: number; durationMs: number; dayNumber: number }>(BRUME_EVENTS.DAY_STARTED, (payload) => {
      this._phase.set('day');
      this._dayNumber.set(payload.dayNumber);
      this._phaseDeadline.set(payload.deadline);
      this._phaseDurationMs.set(payload.durationMs);
    });

    this.socket.on<{ deadline: number; durationMs: number; dayNumber: number }>(BRUME_EVENTS.VOTE_STARTED, (payload) => {
      this._phase.set('vote');
      this._dayNumber.set(payload.dayNumber);
      this._myVote.set(null);
      this._voteProgress.set(null);
      this._phaseDeadline.set(payload.deadline);
      this._phaseDurationMs.set(payload.durationMs);
    });

    this.socket.on<BrumeVoteProgress>(BRUME_EVENTS.VOTE_PROGRESS, (payload) => {
      this._voteProgress.set(payload);
    });

    this.socket.on<{ eliminatedId: string | null; eliminatedPseudo: string | null }>(
      BRUME_EVENTS.VOTE_RESULT,
      (payload) => {
        this._voteResult.set(payload);
        if (payload.eliminatedId) {
          this._alivePlayerIds.update((ids) => ids.filter((id) => id !== payload.eliminatedId));
        }
      },
    );

    this.socket.on<BrumeChatMessage>(BRUME_EVENTS.CHAT_MESSAGE, (payload) => {
      if (payload.channel === 'pack') this._packChat.update((list) => [...list, payload]);
      else this._dayChat.update((list) => [...list, payload]);
    });

    this.socket.on<BrumeResult>(BRUME_EVENTS.RESULTS, (payload) => {
      this._phase.set('results');
      this._results.set(payload);
    });

    // Photo instantanee demandee au montage (voir requestState()) : ne peut
    // jamais etre manquee contrairement aux broadcasts one-shot ci-dessus.
    this.socket.on<BrumeSnapshot>(BRUME_EVENTS.STATE, (snapshot) => {
      this._phase.set(snapshot.phase);
      this._dayNumber.set(snapshot.dayNumber);
      if (snapshot.players.length) this._players.set(snapshot.players);
      this._alivePlayerIds.set(snapshot.alivePlayerIds);
      this._myRole.set(snapshot.myRole);
      this._myTeam.set(snapshot.myTeam);
      if (snapshot.myChampion) this._myChampion.set(snapshot.myChampion);
      if (snapshot.myKit) this._myKit.set(snapshot.myKit);
      this._myTeammates.set(snapshot.myTeammates ?? []);
      this._revealReady.set(snapshot.myRevealReady);
      this._revealProgress.set(snapshot.revealProgress);
      this._phaseDeadline.set(snapshot.phaseDeadline);
      this._phaseDurationMs.set(snapshot.phaseDurationMs);
      this._myNightActionSubmitted.set(snapshot.myNightActionSubmitted);
      this._myFiddlesticksPending.set(snapshot.myFiddlesticksPending);
      this._myKindredMarqueId.set(snapshot.myKindredMarqueId);
      this._myKindredHuntStreak.set(snapshot.myKindredHuntStreak);
      this._myAsheClue.set(snapshot.myAsheClue);
      this._lastDawn.set(snapshot.lastDawn);
      this._packChat.set(snapshot.packChat);
      this._dayChat.set(snapshot.dayChat);
      this._myVote.set(snapshot.myVote);
      this._voteProgress.set(snapshot.voteProgress);
      if (snapshot.results) this._results.set(snapshot.results);
    });
  }

  /** A appeler au montage du composant pour se synchroniser quel que soit le timing. */
  requestState(): void {
    this.socket.emit(BRUME_EVENTS.REQUEST_STATE);
  }

  acknowledgeReveal(): void {
    if (this._revealReady()) return;
    this._revealReady.set(true);
    this.socket.emit(BRUME_EVENTS.REVEAL_READY);
  }

  submitNightAction(action: BrumeNightActionType, targetId?: string): void {
    this._myNightActionSubmitted.set(true);
    this.socket.emit(BRUME_EVENTS.NIGHT_ACTION, { action, targetId });
  }

  /** Peut etre appele plusieurs fois : un joueur change son vote librement tant que le temps du vote n'est pas ecoule (voir demande produit). */
  submitVote(targetId: string): void {
    this._myVote.set(targetId);
    this.socket.emit(BRUME_EVENTS.VOTE, { targetId });
  }

  sendChat(channel: BrumeChatChannel, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.socket.emit(BRUME_EVENTS.CHAT_SEND, { channel, text: trimmed });
  }

  reset(): void {
    this._phase.set('reveal');
    this._dayNumber.set(1);
    this._players.set([]);
    this._alivePlayerIds.set([]);
    this._myRole.set(null);
    this._myTeam.set(null);
    this._myChampion.set(null);
    this._myKit.set(null);
    this._myTeammates.set([]);
    this._revealReady.set(false);
    this._revealProgress.set(null);
    this._phaseDeadline.set(null);
    this._myNightActionSubmitted.set(false);
    this._myFiddlesticksPending.set(false);
    this._myKindredMarqueId.set(null);
    this._myKindredHuntStreak.set(0);
    this._myAsheClue.set(null);
    this._lastDawn.set(null);
    this._voteResult.set(null);
    this._packChat.set([]);
    this._dayChat.set([]);
    this._myVote.set(null);
    this._voteProgress.set(null);
    this._results.set(null);
  }
}
