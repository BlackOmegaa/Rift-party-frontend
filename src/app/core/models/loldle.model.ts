export type LoldleLetterState = 'correct' | 'present' | 'absent';

export interface LoldleGuessRow {
  name: string;
  feedback: LoldleLetterState[];
}

export interface LoldleFeedEntry {
  playerId: string;
  pseudo: string;
  attemptNumber: number;
  solved: boolean;
}

export interface LoldleResultRow {
  playerId: string;
  pseudo: string;
  solved: boolean;
  attempts: number;
  points: number;
}

export interface LoldleResult {
  secretName: string;
  rows: LoldleResultRow[];
  scores: Record<string, number>;
  summary: string;
}

export interface LoldleSnapshot {
  active: boolean;
  phase: 'guessing' | 'results';
  wordLength: number;
  maxGuesses: number;
  phaseDeadline: number | null;
  phaseDurationMs: number;
  myRows: LoldleGuessRow[];
  myDone: boolean;
  mySolved: boolean;
  feed: LoldleFeedEntry[];
  results: LoldleResult | null;
}
