export interface UndercoverPlayerRef {
  id: string;
  pseudo: string;
}

export interface UndercoverTurnEntry {
  playerId: string;
  pseudo: string;
  word: string;
  round: 1 | 2;
  timedOut: boolean;
}

export interface UndercoverTurnInfo {
  playerId: string;
  round: 1 | 2;
  deadline: number;
}

export interface UndercoverResult {
  undercoverId: string;
  undercoverPseudo: string;
  normalWord: string;
  undercoverWord: string;
  found: boolean;
  votes: Record<string, string>;
  words: UndercoverTurnEntry[];
  scores: Record<string, number>;
  summary: string;
}

export type UndercoverWirePhase = 'reveal' | 'turn1' | 'turn2' | 'vote' | 'results';

export interface UndercoverVoteProgress {
  ready: number;
  total: number;
  votes: Record<string, string>; // voterId -> targetId
}

export interface UndercoverSnapshot {
  active: boolean;
  turnOrder: UndercoverPlayerRef[];
  turnDurationMs: number;
  phase: UndercoverWirePhase;
  myWord: string | null;
  myRevealReady: boolean;
  words: UndercoverTurnEntry[];
  activeTurn: UndercoverTurnInfo | null;
  revealProgress: { ready: number; total: number };
  myVote: string | null;
  voteProgress: UndercoverVoteProgress;
  results: UndercoverResult | null;
}
