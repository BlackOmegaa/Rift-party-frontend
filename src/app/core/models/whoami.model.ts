export interface WhoamiAssignmentView {
	playerId: string;
	pseudo: string;
	champion: string | null;
	found: boolean;
	failed: boolean;
	questionsUsed: number;
	points: number;
}

export interface WhoamiTurnState {
	activePlayerId: string;
	activePseudo: string;
	phase: 'answering' | 'decision';
	deadline: number;
	questionsUsed: number;
	lastQuestion: { yes: number; no: number; verdict: 'oui' | 'non' | 'egalite' } | null;
	canContinue: boolean;
	mustGuess: boolean;
}

export interface WhoamiGuessResult {
	playerId: string;
	pseudo: string;
	guess: string;
	correct: boolean;
	actualChampion: string | null;
	points: number;
	eliminated: boolean;
}

export interface WhoamiResult {
	rows: { playerId: string; pseudo: string; champion: string; found: boolean; questionsUsed: number; points: number }[];
	scores: Record<string, number>;
	summary: string;
}

export interface WhoamiSnapshot {
	active: boolean;
	assignments: WhoamiAssignmentView[];
	turn: WhoamiTurnState | null;
	myAnswered: boolean;
	answeredCount: number;
	expectedCount: number;
	lastGuess: WhoamiGuessResult | null;
	results: WhoamiResult | null;
}
