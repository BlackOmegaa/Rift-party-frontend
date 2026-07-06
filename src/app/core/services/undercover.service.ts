import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';
import {
  UndercoverPlayerRef,
  UndercoverResult,
  UndercoverSnapshot,
  UndercoverTurnEntry,
  UndercoverTurnInfo,
  UndercoverVoteProgress,
  UndercoverWirePhase,
} from '../models/undercover.model';

const UNDERCOVER_EVENTS = {
  START: 'undercover:start',
  REVEAL: 'undercover:reveal',
  REVEAL_READY: 'undercover:reveal-ready',
  REVEAL_PROGRESS: 'undercover:reveal-progress',
  TURN_STARTED: 'undercover:turn-started',
  SUBMIT_WORD: 'undercover:submit-word',
  WORD_SUBMITTED: 'undercover:word-submitted',
  VOTE_PHASE: 'undercover:vote-phase',
  VOTE: 'undercover:vote',
  VOTE_PROGRESS: 'undercover:vote-progress',
  RESULTS: 'undercover:results',
  REQUEST_STATE: 'undercover:request-state',
  STATE: 'undercover:state',
} as const;

export type UndercoverPhase = 'idle' | 'reveal' | 'turns' | 'vote' | 'results';

function toLocalPhase(wire: UndercoverWirePhase): UndercoverPhase {
  return wire === 'turn1' || wire === 'turn2' ? 'turns' : wire;
}

/**
 * Etat du mini-jeu Undercover Champion, en signals. Suit le meme pattern que
 * DraftService : le composant ne fait jamais de logique metier, il lit ces
 * signals et appelle les methodes d'action.
 */
@Injectable({ providedIn: 'root' })
export class UndercoverService {
  private readonly _phase = signal<UndercoverPhase>('idle');
  private readonly _turnOrder = signal<UndercoverPlayerRef[]>([]);
  private readonly _turnDurationMs = signal(30_000);
  private readonly _myWord = signal<string | null>(null);
  private readonly _revealReady = signal(false);
  private readonly _revealProgress = signal<{ ready: number; total: number } | null>(null);
  private readonly _words = signal<UndercoverTurnEntry[]>([]);
  private readonly _activeTurn = signal<UndercoverTurnInfo | null>(null);
  private readonly _voteProgress = signal<UndercoverVoteProgress | null>(null);
  private readonly _myVote = signal<string | null>(null);
  private readonly _results = signal<UndercoverResult | null>(null);

  readonly phase = this._phase.asReadonly();
  readonly turnOrder = this._turnOrder.asReadonly();
  readonly turnDurationMs = this._turnDurationMs.asReadonly();
  readonly myWord = this._myWord.asReadonly();
  readonly revealReady = this._revealReady.asReadonly();
  readonly revealProgress = this._revealProgress.asReadonly();
  readonly words = this._words.asReadonly();
  readonly activeTurn = this._activeTurn.asReadonly();
  readonly voteProgress = this._voteProgress.asReadonly();
  readonly myVote = this._myVote.asReadonly();
  readonly results = this._results.asReadonly();

  constructor(private readonly socket: SocketService) {
    this.socket.on<{ turnOrder: UndercoverPlayerRef[]; turnDurationMs: number }>(
      UNDERCOVER_EVENTS.START,
      (payload) => {
        this.reset();
        this._turnOrder.set(payload.turnOrder);
        this._turnDurationMs.set(payload.turnDurationMs);
        this._phase.set('reveal');
      },
    );

    this.socket.on<{ word: string }>(UNDERCOVER_EVENTS.REVEAL, (payload) => {
      this._myWord.set(payload.word);
    });

    this.socket.on<{ ready: number; total: number }>(UNDERCOVER_EVENTS.REVEAL_PROGRESS, (payload) => {
      this._revealProgress.set(payload);
    });

    this.socket.on<UndercoverTurnInfo>(UNDERCOVER_EVENTS.TURN_STARTED, (payload) => {
      this._phase.set('turns');
      this._activeTurn.set(payload);
    });

    this.socket.on<UndercoverTurnEntry>(UNDERCOVER_EVENTS.WORD_SUBMITTED, (payload) => {
      this._words.update((words) => [...words, payload]);
    });

    this.socket.on(UNDERCOVER_EVENTS.VOTE_PHASE, () => {
      this._phase.set('vote');
      this._activeTurn.set(null);
    });

    this.socket.on<UndercoverVoteProgress>(UNDERCOVER_EVENTS.VOTE_PROGRESS, (payload) => {
      this._voteProgress.set(payload);
    });

    this.socket.on<UndercoverResult>(UNDERCOVER_EVENTS.RESULTS, (payload) => {
      this._phase.set('results');
      this._results.set(payload);
    });

    // Photo instantanee demandee explicitement au montage du composant (voir
    // requestState()) : contrairement aux broadcasts one-shot ci-dessus, elle
    // ne peut jamais etre manquee puisqu'elle part une fois ces listeners deja
    // attaches, quel que soit le moment ou le composant a ete monte.
    this.socket.on<UndercoverSnapshot>(UNDERCOVER_EVENTS.STATE, (snapshot) => {
      this._turnOrder.set(snapshot.turnOrder);
      this._turnDurationMs.set(snapshot.turnDurationMs);
      this._phase.set(toLocalPhase(snapshot.phase));
      this._myWord.set(snapshot.myWord);
      this._revealReady.set(snapshot.myRevealReady);
      this._revealProgress.set(snapshot.revealProgress);
      this._words.set(snapshot.words);
      this._activeTurn.set(snapshot.activeTurn);
      this._myVote.set(snapshot.myVote);
      this._voteProgress.set(snapshot.voteProgress);
      this._results.set(snapshot.results);
    });
  }

  /** A appeler au montage du composant pour se synchroniser quel que soit le timing. */
  requestState(): void {
    this.socket.emit(UNDERCOVER_EVENTS.REQUEST_STATE);
  }

  acknowledgeReveal(): void {
    if (this._revealReady()) return;
    this._revealReady.set(true);
    this.socket.emit(UNDERCOVER_EVENTS.REVEAL_READY);
  }

  submitWord(word: string): void {
    this.socket.emit(UNDERCOVER_EVENTS.SUBMIT_WORD, { word });
  }

  submitVote(targetId: string): void {
    if (this._myVote()) return;
    this._myVote.set(targetId);
    this.socket.emit(UNDERCOVER_EVENTS.VOTE, { targetId });
  }

  reset(): void {
    this._phase.set('idle');
    this._turnOrder.set([]);
    this._myWord.set(null);
    this._revealReady.set(false);
    this._revealProgress.set(null);
    this._words.set([]);
    this._activeTurn.set(null);
    this._voteProgress.set(null);
    this._myVote.set(null);
    this._results.set(null);
  }
}
