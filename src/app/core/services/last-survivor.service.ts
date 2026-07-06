import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';
import {
	LastSurvivorCandidate,
	LastSurvivorResult,
	LastSurvivorRoundResult,
	LastSurvivorSnapshot,
} from '../models/last-survivor.model';

const LAST_SURVIVOR_EVENTS = {
	START: 'lastsurvivor:start',
	VOTE: 'lastsurvivor:vote',
	VOTE_PROGRESS: 'lastsurvivor:vote-progress',
	ROUND_RESULT: 'lastsurvivor:round-result',
	NEXT: 'lastsurvivor:next',
	ROUND: 'lastsurvivor:round',
	RESULTS: 'lastsurvivor:results',
	REQUEST_STATE: 'lastsurvivor:request-state',
	STATE: 'lastsurvivor:state',
} as const;

interface RoundPayload {
	category: string;
	candidates: LastSurvivorCandidate[];
	roundNumber: number;
	totalRounds: number;
	deadline: number;
}

/**
 * Etat du mini-jeu "Last Survivor", en signals. Meme convention que
 * VotePartyService : le composant ne fait jamais de logique metier.
 */
@Injectable({ providedIn: 'root' })
export class LastSurvivorService {
	private readonly _phase = signal<'voting' | 'reveal' | 'results'>('voting');
	private readonly _category = signal<string | null>(null);
	private readonly _candidates = signal<LastSurvivorCandidate[]>([]);
	private readonly _roundNumber = signal(0);
	private readonly _totalRounds = signal(0);
	private readonly _deadline = signal<number | null>(null);
	private readonly _myVote = signal<string | null>(null);
	private readonly _votedCount = signal(0);
	private readonly _expectedCount = signal(0);
	private readonly _lastRound = signal<LastSurvivorRoundResult | null>(null);
	private readonly _results = signal<LastSurvivorResult | null>(null);

	readonly phase = this._phase.asReadonly();
	readonly category = this._category.asReadonly();
	readonly candidates = this._candidates.asReadonly();
	readonly roundNumber = this._roundNumber.asReadonly();
	readonly totalRounds = this._totalRounds.asReadonly();
	readonly deadline = this._deadline.asReadonly();
	readonly myVote = this._myVote.asReadonly();
	readonly votedCount = this._votedCount.asReadonly();
	readonly expectedCount = this._expectedCount.asReadonly();
	readonly lastRound = this._lastRound.asReadonly();
	readonly results = this._results.asReadonly();

	constructor(private readonly socket: SocketService) {
		const onRound = (payload: RoundPayload) => {
			this._phase.set('voting');
			this._category.set(payload.category);
			this._candidates.set(payload.candidates);
			this._roundNumber.set(payload.roundNumber);
			this._totalRounds.set(payload.totalRounds);
			this._deadline.set(payload.deadline);
			this._myVote.set(null);
			this._votedCount.set(0);
			this._lastRound.set(null);
		};

		this.socket.on<RoundPayload>(LAST_SURVIVOR_EVENTS.START, (payload) => {
			this.reset();
			onRound(payload);
		});
		this.socket.on<RoundPayload>(LAST_SURVIVOR_EVENTS.ROUND, onRound);

		this.socket.on<{ votedCount: number; expectedCount: number }>(
			LAST_SURVIVOR_EVENTS.VOTE_PROGRESS,
			(payload) => {
				this._votedCount.set(payload.votedCount);
				this._expectedCount.set(payload.expectedCount);
			},
		);

		this.socket.on<LastSurvivorRoundResult>(LAST_SURVIVOR_EVENTS.ROUND_RESULT, (payload) => {
			this._phase.set('reveal');
			this._lastRound.set(payload);
			this._candidates.set(payload.remaining);
		});

		this.socket.on<LastSurvivorResult>(LAST_SURVIVOR_EVENTS.RESULTS, (payload) => {
			this._phase.set('results');
			this._results.set(payload);
		});

		// Photo instantanee demandee au montage (voir requestState()) : ne peut
		// jamais etre manquee contrairement aux broadcasts one-shot ci-dessus.
		this.socket.on<LastSurvivorSnapshot>(LAST_SURVIVOR_EVENTS.STATE, (snapshot) => {
			this._phase.set(snapshot.phase);
			this._category.set(snapshot.category);
			this._candidates.set(snapshot.candidates);
			this._roundNumber.set(snapshot.roundNumber);
			this._totalRounds.set(snapshot.totalRounds);
			this._deadline.set(snapshot.deadline);
			this._myVote.set(snapshot.myVote);
			this._votedCount.set(snapshot.votedCount);
			this._expectedCount.set(snapshot.expectedCount);
			this._lastRound.set(snapshot.lastRound);
			if (snapshot.results) this._results.set(snapshot.results);
		});
	}

	/** A appeler au montage du composant pour se synchroniser quel que soit le timing. */
	requestState(): void {
		this.socket.emit(LAST_SURVIVOR_EVENTS.REQUEST_STATE);
	}

	vote(targetLabel: string): void {
		if (this._myVote() !== null || this._phase() !== 'voting') return;
		this._myVote.set(targetLabel);
		this.socket.emit(LAST_SURVIVOR_EVENTS.VOTE, { targetLabel });
	}

	next(): void {
		this.socket.emit(LAST_SURVIVOR_EVENTS.NEXT);
	}

	reset(): void {
		this._phase.set('voting');
		this._category.set(null);
		this._candidates.set([]);
		this._roundNumber.set(0);
		this._totalRounds.set(0);
		this._deadline.set(null);
		this._myVote.set(null);
		this._votedCount.set(0);
		this._expectedCount.set(0);
		this._lastRound.set(null);
		this._results.set(null);
	}
}
