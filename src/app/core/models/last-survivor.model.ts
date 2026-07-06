export interface LastSurvivorCandidate {
	champion: string;
	label: string;
}

export interface LastSurvivorTally {
	label: string;
	champion: string;
	votes: number;
	voters: { playerId: string; pseudo: string }[];
}

export interface LastSurvivorRoundResult {
	category: string;
	roundNumber: number;
	totalRounds: number;
	tallies: LastSurvivorTally[];
	eliminated: LastSurvivorCandidate;
	tieBreak: boolean;
	remaining: LastSurvivorCandidate[];
	roundPoints: Record<string, number>;
	totalScores: Record<string, number>;
}

export interface LastSurvivorResult {
	category: string;
	winner: LastSurvivorCandidate;
	rows: { playerId: string; pseudo: string; points: number }[];
	scores: Record<string, number>;
	summary: string;
}

export interface LastSurvivorSnapshot {
	active: boolean;
	phase: 'voting' | 'reveal' | 'results';
	category: string | null;
	candidates: LastSurvivorCandidate[];
	roundNumber: number;
	totalRounds: number;
	deadline: number | null;
	myVote: string | null;
	votedCount: number;
	expectedCount: number;
	lastRound: LastSurvivorRoundResult | null;
	results: LastSurvivorResult | null;
}
