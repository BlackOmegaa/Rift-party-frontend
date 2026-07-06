import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';
import {
  LoldleFeedEntry,
  LoldleGuessRow,
  LoldleResult,
  LoldleSnapshot,
} from '../models/loldle.model';

const LOLDLE_EVENTS = {
  START: 'loldle:start',
  GUESS: 'loldle:guess',
  GUESS_RESULT: 'loldle:guess-result',
  PROGRESS: 'loldle:progress',
  RESULTS: 'loldle:results',
  REQUEST_STATE: 'loldle:request-state',
  STATE: 'loldle:state',
} as const;

/**
 * Etat du mini-jeu "Loldle", en signals. Meme convention que BrumeService :
 * le composant ne fait jamais de logique metier, il lit ces signals et
 * appelle les methodes d'action.
 */
@Injectable({ providedIn: 'root' })
export class LoldleService {
  private readonly _phase = signal<'guessing' | 'results'>('guessing');
  private readonly _wordLength = signal(0);
  private readonly _maxGuesses = signal(6);
  private readonly _phaseDeadline = signal<number | null>(null);
  private readonly _phaseDurationMs = signal(120_000);
  private readonly _myRows = signal<LoldleGuessRow[]>([]);
  private readonly _myDone = signal(false);
  private readonly _mySolved = signal(false);
  private readonly _feed = signal<LoldleFeedEntry[]>([]);
  private readonly _results = signal<LoldleResult | null>(null);

  readonly phase = this._phase.asReadonly();
  readonly wordLength = this._wordLength.asReadonly();
  readonly maxGuesses = this._maxGuesses.asReadonly();
  readonly phaseDeadline = this._phaseDeadline.asReadonly();
  readonly phaseDurationMs = this._phaseDurationMs.asReadonly();
  readonly myRows = this._myRows.asReadonly();
  readonly myDone = this._myDone.asReadonly();
  readonly mySolved = this._mySolved.asReadonly();
  readonly feed = this._feed.asReadonly();
  readonly results = this._results.asReadonly();

  constructor(private readonly socket: SocketService) {
    this.socket.on<{ wordLength: number; maxGuesses: number; deadline: number; durationMs: number }>(
      LOLDLE_EVENTS.START,
      (payload) => {
        this.reset();
        this._wordLength.set(payload.wordLength);
        this._maxGuesses.set(payload.maxGuesses);
        this._phaseDeadline.set(payload.deadline);
        this._phaseDurationMs.set(payload.durationMs);
        this._phase.set('guessing');
      },
    );

    this.socket.on<LoldleGuessRow>(LOLDLE_EVENTS.GUESS_RESULT, (row) => {
      this._myRows.update((rows) => [...rows, row]);
      const solved = row.feedback.every((f) => f === 'correct');
      if (solved) this._mySolved.set(true);
      if (solved || this._myRows().length >= this._maxGuesses()) this._myDone.set(true);
    });

    this.socket.on<LoldleFeedEntry>(LOLDLE_EVENTS.PROGRESS, (entry) => {
      this._feed.update((list) => [...list, entry]);
    });

    this.socket.on<LoldleResult>(LOLDLE_EVENTS.RESULTS, (payload) => {
      this._phase.set('results');
      this._results.set(payload);
    });

    // Photo instantanee demandee au montage (voir requestState()) : ne peut
    // jamais etre manquee contrairement aux broadcasts one-shot ci-dessus.
    this.socket.on<LoldleSnapshot>(LOLDLE_EVENTS.STATE, (snapshot) => {
      this._phase.set(snapshot.phase);
      this._wordLength.set(snapshot.wordLength);
      this._maxGuesses.set(snapshot.maxGuesses);
      this._phaseDeadline.set(snapshot.phaseDeadline);
      this._phaseDurationMs.set(snapshot.phaseDurationMs);
      this._myRows.set(snapshot.myRows);
      this._myDone.set(snapshot.myDone);
      this._mySolved.set(snapshot.mySolved);
      this._feed.set(snapshot.feed);
      if (snapshot.results) this._results.set(snapshot.results);
    });
  }

  /** A appeler au montage du composant pour se synchroniser quel que soit le timing. */
  requestState(): void {
    this.socket.emit(LOLDLE_EVENTS.REQUEST_STATE);
  }

  submitGuess(name: string): void {
    if (this._myDone()) return;
    this.socket.emit(LOLDLE_EVENTS.GUESS, { name });
  }

  reset(): void {
    this._phase.set('guessing');
    this._wordLength.set(0);
    this._maxGuesses.set(6);
    this._phaseDeadline.set(null);
    this._myRows.set([]);
    this._myDone.set(false);
    this._mySolved.set(false);
    this._feed.set([]);
    this._results.set(null);
  }
}
