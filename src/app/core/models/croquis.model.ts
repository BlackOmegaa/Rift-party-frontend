export interface CroquisGalleryItem {
	artistId: string;
	artistPseudo: string;
	/** Null si l'artiste n'a pas rendu de dessin a temps : garde quand meme sa place dans la galerie. */
	image: string | null;
	index: number;
	total: number;
	deadline: number;
}

export interface CroquisReveal {
	artistId: string;
	artistPseudo: string;
	champion: string;
	image: string | null;
	guesses: { playerId: string; pseudo: string; guess: string; correct: boolean }[];
	roundPoints: Record<string, number>;
	totalScores: Record<string, number>;
	isLast: boolean;
}

export interface CroquisResult {
	rows: { playerId: string; pseudo: string; points: number }[];
	scores: Record<string, number>;
	summary: string;
}

export interface CroquisSnapshot {
	active: boolean;
	phase: 'drawing' | 'guessing' | 'reveal' | 'results';
	myChampion: string | null;
	drawingDeadline: number | null;
	mySubmitted: boolean;
	submittedCount: number;
	expectedCount: number;
	item: CroquisGalleryItem | null;
	myGuess: string | null;
	guessedCount: number;
	guessExpectedCount: number;
	lastReveal: CroquisReveal | null;
	results: CroquisResult | null;
}
