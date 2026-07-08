import { Injectable, signal } from '@angular/core';
import { SocketService } from './socket.service';
import {
	CroquisGalleryItem,
	CroquisResult,
	CroquisReveal,
	CroquisSnapshot,
} from '../models/croquis.model';

const CROQUIS_EVENTS = {
	START: 'croquis:start',
	SUBMIT_DRAWING: 'croquis:submit-drawing',
	DRAWING_PROGRESS: 'croquis:drawing-progress',
	GALLERY_ITEM: 'croquis:gallery-item',
	GUESS: 'croquis:guess',
	GUESS_PROGRESS: 'croquis:guess-progress',
	REVEAL: 'croquis:reveal',
	NEXT: 'croquis:next',
	RESULTS: 'croquis:results',
	REQUEST_STATE: 'croquis:request-state',
	STATE: 'croquis:state',
} as const;

/**
 * Etat du mini-jeu "Croquis", en signals. Meme convention que les autres
 * services de mini-jeu : le composant ne fait jamais de logique metier.
 */
@Injectable({ providedIn: 'root' })
export class CroquisService {
	private readonly _phase = signal<'drawing' | 'guessing' | 'reveal' | 'results'>('drawing');
	private readonly _myChampion = signal<string | null>(null);
	private readonly _drawingDeadline = signal<number | null>(null);
	private readonly _mySubmitted = signal(false);
	private readonly _submittedCount = signal(0);
	private readonly _expectedCount = signal(0);
	private readonly _item = signal<CroquisGalleryItem | null>(null);
	private readonly _myGuess = signal<string | null>(null);
	private readonly _guessedCount = signal(0);
	private readonly _guessExpectedCount = signal(0);
	private readonly _lastReveal = signal<CroquisReveal | null>(null);
	private readonly _results = signal<CroquisResult | null>(null);

	readonly phase = this._phase.asReadonly();
	readonly myChampion = this._myChampion.asReadonly();
	readonly drawingDeadline = this._drawingDeadline.asReadonly();
	readonly mySubmitted = this._mySubmitted.asReadonly();
	readonly submittedCount = this._submittedCount.asReadonly();
	readonly expectedCount = this._expectedCount.asReadonly();
	readonly item = this._item.asReadonly();
	readonly myGuess = this._myGuess.asReadonly();
	readonly guessedCount = this._guessedCount.asReadonly();
	readonly guessExpectedCount = this._guessExpectedCount.asReadonly();
	readonly lastReveal = this._lastReveal.asReadonly();
	readonly results = this._results.asReadonly();

	constructor(private readonly socket: SocketService) {
		this.socket.on<{ champion: string; drawingTimeSec: number; deadline: number }>(
			CROQUIS_EVENTS.START,
			(payload) => {
				this.reset();
				this._myChampion.set(payload.champion);
				this._drawingDeadline.set(payload.deadline);
				this._phase.set('drawing');
			},
		);

		this.socket.on<{ submittedCount: number; expectedCount: number }>(
			CROQUIS_EVENTS.DRAWING_PROGRESS,
			(payload) => {
				this._submittedCount.set(payload.submittedCount);
				this._expectedCount.set(payload.expectedCount);
			},
		);

		this.socket.on<CroquisGalleryItem>(CROQUIS_EVENTS.GALLERY_ITEM, (item) => {
			this._phase.set('guessing');
			this._item.set(item);
			this._myGuess.set(null);
			this._guessedCount.set(0);
			this._lastReveal.set(null);
		});

		this.socket.on<{ guessedCount: number; expectedCount: number }>(
			CROQUIS_EVENTS.GUESS_PROGRESS,
			(payload) => {
				this._guessedCount.set(payload.guessedCount);
				this._guessExpectedCount.set(payload.expectedCount);
			},
		);

		this.socket.on<CroquisReveal>(CROQUIS_EVENTS.REVEAL, (reveal) => {
			this._phase.set('reveal');
			this._lastReveal.set(reveal);
		});

		this.socket.on<CroquisResult>(CROQUIS_EVENTS.RESULTS, (payload) => {
			this._phase.set('results');
			this._results.set(payload);
		});

		// Le serveur peut rejeter la soumission (dessin trop lourd, phase deja
		// avancee...) : l'ack optimiste de submitDrawing() doit revenir en
		// arriere, sinon l'UI affiche "envoye" alors que le serveur n'a rien
		// stocke - et l'artiste disparait silencieusement de la galerie.
		this.socket.on<{ message: string }>('room:error', () => {
			if (this._phase() === 'drawing') this._mySubmitted.set(false);
		});

		// Photo instantanee demandee au montage (voir requestState()) : ne peut
		// jamais etre manquee contrairement aux broadcasts one-shot ci-dessus.
		this.socket.on<CroquisSnapshot>(CROQUIS_EVENTS.STATE, (snapshot) => {
			this._phase.set(snapshot.phase);
			this._myChampion.set(snapshot.myChampion);
			this._drawingDeadline.set(snapshot.drawingDeadline);
			this._mySubmitted.set(snapshot.mySubmitted);
			this._submittedCount.set(snapshot.submittedCount);
			this._expectedCount.set(snapshot.expectedCount);
			this._item.set(snapshot.item);
			this._myGuess.set(snapshot.myGuess);
			this._guessedCount.set(snapshot.guessedCount);
			this._guessExpectedCount.set(snapshot.guessExpectedCount);
			this._lastReveal.set(snapshot.lastReveal);
			if (snapshot.results) this._results.set(snapshot.results);
		});
	}

	/** A appeler au montage du composant pour se synchroniser quel que soit le timing. */
	requestState(): void {
		this.socket.emit(CROQUIS_EVENTS.REQUEST_STATE);
	}

	submitDrawing(image: string): void {
		if (this._mySubmitted()) return;
		this._mySubmitted.set(true);
		this.socket.emit(CROQUIS_EVENTS.SUBMIT_DRAWING, { image });
	}

	guess(champion: string): void {
		if (this._myGuess() !== null) return;
		this._myGuess.set(champion);
		this.socket.emit(CROQUIS_EVENTS.GUESS, { champion });
	}

	next(): void {
		this.socket.emit(CROQUIS_EVENTS.NEXT);
	}

	reset(): void {
		this._phase.set('drawing');
		this._myChampion.set(null);
		this._drawingDeadline.set(null);
		this._mySubmitted.set(false);
		this._submittedCount.set(0);
		this._expectedCount.set(0);
		this._item.set(null);
		this._myGuess.set(null);
		this._guessedCount.set(0);
		this._guessExpectedCount.set(0);
		this._lastReveal.set(null);
		this._results.set(null);
	}
}
