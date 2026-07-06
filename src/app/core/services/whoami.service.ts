import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';
import {
	WhoamiAssignmentView,
	WhoamiGuessResult,
	WhoamiResult,
	WhoamiSnapshot,
	WhoamiTurnState,
} from '../models/whoami.model';

const WHOAMI_EVENTS = {
	START: 'whoami:start',
	ANSWER: 'whoami:answer',
	ANSWER_PROGRESS: 'whoami:answer-progress',
	TURN: 'whoami:turn',
	NEXT_QUESTION: 'whoami:next-question',
	PASS: 'whoami:pass',
	GUESS: 'whoami:guess',
	GUESS_RESULT: 'whoami:guess-result',
	RESULTS: 'whoami:results',
	REQUEST_STATE: 'whoami:request-state',
	STATE: 'whoami:state',
} as const;

/**
 * Etat du mini-jeu "Qui suis-je ?", en signals. Meme convention que les autres
 * services de mini-jeu : le composant ne fait jamais de logique metier.
 */
@Injectable({ providedIn: 'root' })
export class WhoamiService {
	private readonly _assignments = signal<WhoamiAssignmentView[]>([]);
	private readonly _turn = signal<WhoamiTurnState | null>(null);
	private readonly _myAnswered = signal(false);
	private readonly _answeredCount = signal(0);
	private readonly _expectedCount = signal(0);
	private readonly _lastGuess = signal<WhoamiGuessResult | null>(null);
	private readonly _results = signal<WhoamiResult | null>(null);

	readonly assignments = this._assignments.asReadonly();
	readonly turn = this._turn.asReadonly();
	readonly myAnswered = this._myAnswered.asReadonly();
	readonly answeredCount = this._answeredCount.asReadonly();
	readonly expectedCount = this._expectedCount.asReadonly();
	readonly lastGuess = this._lastGuess.asReadonly();
	readonly results = this._results.asReadonly();

	constructor(private readonly socket: SocketService) {
		this.socket.on<{ assignments: WhoamiAssignmentView[]; turn: WhoamiTurnState | null }>(
			WHOAMI_EVENTS.START,
			(payload) => {
				// START sert aussi de refresh personnalise en cours de partie (apres une
				// devinette ou un depart). Si une partie precedente etait terminee
				// (results pose), ce START annonce une NOUVELLE partie : reset complet.
				if (this._results()) this.reset();
				this._assignments.set(payload.assignments);
				if (payload.turn) this.applyTurn(payload.turn);
			},
		);

		this.socket.on<WhoamiTurnState>(WHOAMI_EVENTS.TURN, (turn) => this.applyTurn(turn));

		this.socket.on<{ answeredCount: number; expectedCount: number }>(
			WHOAMI_EVENTS.ANSWER_PROGRESS,
			(payload) => {
				this._answeredCount.set(payload.answeredCount);
				this._expectedCount.set(payload.expectedCount);
			},
		);

		this.socket.on<WhoamiGuessResult>(WHOAMI_EVENTS.GUESS_RESULT, (result) => {
			this._lastGuess.set(result);
		});

		this.socket.on<WhoamiResult>(WHOAMI_EVENTS.RESULTS, (payload) => {
			this._results.set(payload);
		});

		// Photo instantanee demandee au montage (voir requestState()) : ne peut
		// jamais etre manquee contrairement aux broadcasts one-shot ci-dessus.
		this.socket.on<WhoamiSnapshot>(WHOAMI_EVENTS.STATE, (snapshot) => {
			this._assignments.set(snapshot.assignments);
			this._turn.set(snapshot.turn);
			this._myAnswered.set(snapshot.myAnswered);
			this._answeredCount.set(snapshot.answeredCount);
			this._expectedCount.set(snapshot.expectedCount);
			this._lastGuess.set(snapshot.lastGuess);
			if (snapshot.results) this._results.set(snapshot.results);
		});
	}

	private applyTurn(turn: WhoamiTurnState): void {
		this._turn.set(turn);
		// Nouvelle question ou nouveau tour : reponses remises a zero.
		if (turn.phase === 'answering') {
			this._myAnswered.set(false);
			this._answeredCount.set(0);
		}
	}

	/** A appeler au montage du composant pour se synchroniser quel que soit le timing. */
	requestState(): void {
		this.socket.emit(WHOAMI_EVENTS.REQUEST_STATE);
	}

	answer(value: boolean): void {
		if (this._myAnswered()) return;
		this._myAnswered.set(true);
		this.socket.emit(WHOAMI_EVENTS.ANSWER, { value });
	}

	nextQuestion(): void {
		this.socket.emit(WHOAMI_EVENTS.NEXT_QUESTION);
	}

	pass(): void {
		this.socket.emit(WHOAMI_EVENTS.PASS);
	}

	guess(champion: string): void {
		this.socket.emit(WHOAMI_EVENTS.GUESS, { champion });
	}

	reset(): void {
		this._assignments.set([]);
		this._turn.set(null);
		this._myAnswered.set(false);
		this._answeredCount.set(0);
		this._expectedCount.set(0);
		this._lastGuess.set(null);
		this._results.set(null);
	}
}
