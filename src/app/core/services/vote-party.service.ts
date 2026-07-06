import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';
import {
	VotePartyResult,
	VotePartyRoundResult,
	VotePartySnapshot,
} from '../models/vote-party.model';

const VOTE_PARTY_EVENTS = {
	START: 'voteparty:start',
	VOTE: 'voteparty:vote',
	VOTE_PROGRESS: 'voteparty:vote-progress',
	ROUND_RESULT: 'voteparty:round-result',
	NEXT: 'voteparty:next',
	QUESTION: 'voteparty:question',
	RESULTS: 'voteparty:results',
	REQUEST_STATE: 'voteparty:request-state',
	STATE: 'voteparty:state',
} as const;

interface QuestionPayload {
	question: string;
	roundNumber: number;
	totalRounds: number;
	deadline: number;
}

/**
 * Etat du mini-jeu "Vote Party", en signals. Meme convention que LoldleService :
 * le composant ne fait jamais de logique metier, il lit ces signals et
 * appelle les methodes d'action.
 */
@Injectable({ providedIn: 'root' })
export class VotePartyService {
	private readonly _phase = signal<'voting' | 'reveal' | 'results'>('voting');
	private readonly _question = signal<string | null>(null);
	private readonly _roundNumber = signal(0);
	private readonly _totalRounds = signal(0);
	private readonly _deadline = signal<number | null>(null);
	private readonly _myVote = signal<string | null>(null);
	private readonly _votedCount = signal(0);
	private readonly _expectedCount = signal(0);
	private readonly _lastRound = signal<VotePartyRoundResult | null>(null);
	private readonly _results = signal<VotePartyResult | null>(null);

	readonly phase = this._phase.asReadonly();
	readonly question = this._question.asReadonly();
	readonly roundNumber = this._roundNumber.asReadonly();
	readonly totalRounds = this._totalRounds.asReadonly();
	readonly deadline = this._deadline.asReadonly();
	readonly myVote = this._myVote.asReadonly();
	readonly votedCount = this._votedCount.asReadonly();
	readonly expectedCount = this._expectedCount.asReadonly();
	readonly lastRound = this._lastRound.asReadonly();
	readonly results = this._results.asReadonly();

	constructor(private readonly socket: SocketService) {
		const onQuestion = (payload: QuestionPayload) => {
			this._phase.set('voting');
			this._question.set(payload.question);
			this._roundNumber.set(payload.roundNumber);
			this._totalRounds.set(payload.totalRounds);
			this._deadline.set(payload.deadline);
			this._myVote.set(null);
			this._votedCount.set(0);
			this._lastRound.set(null);
		};

		this.socket.on<QuestionPayload>(VOTE_PARTY_EVENTS.START, (payload) => {
			this.reset();
			onQuestion(payload);
		});
		this.socket.on<QuestionPayload>(VOTE_PARTY_EVENTS.QUESTION, onQuestion);

		this.socket.on<{ votedCount: number; expectedCount: number }>(
			VOTE_PARTY_EVENTS.VOTE_PROGRESS,
			(payload) => {
				this._votedCount.set(payload.votedCount);
				this._expectedCount.set(payload.expectedCount);
			},
		);

		this.socket.on<VotePartyRoundResult>(VOTE_PARTY_EVENTS.ROUND_RESULT, (payload) => {
			this._phase.set('reveal');
			this._lastRound.set(payload);
		});

		this.socket.on<VotePartyResult>(VOTE_PARTY_EVENTS.RESULTS, (payload) => {
			this._phase.set('results');
			this._results.set(payload);
		});

		// Photo instantanee demandee au montage (voir requestState()) : ne peut
		// jamais etre manquee contrairement aux broadcasts one-shot ci-dessus.
		this.socket.on<VotePartySnapshot>(VOTE_PARTY_EVENTS.STATE, (snapshot) => {
			this._phase.set(snapshot.phase);
			this._question.set(snapshot.question);
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
		this.socket.emit(VOTE_PARTY_EVENTS.REQUEST_STATE);
	}

	vote(targetId: string): void {
		if (this._myVote() !== null || this._phase() !== 'voting') return;
		this._myVote.set(targetId);
		this.socket.emit(VOTE_PARTY_EVENTS.VOTE, { targetId });
	}

	next(): void {
		this.socket.emit(VOTE_PARTY_EVENTS.NEXT);
	}

	reset(): void {
		this._phase.set('voting');
		this._question.set(null);
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
