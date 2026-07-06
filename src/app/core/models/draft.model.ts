import { IconName } from '../../shared/components/icon/icon.component';

export type Role = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export type ChampionTag =
  | 'tank' | 'mage' | 'assassin' | 'marksman' | 'support' | 'fighter'
  | 'engage' | 'disengage' | 'poke' | 'burst' | 'sustain' | 'mobility'
  | 'scaling-early' | 'scaling-mid' | 'scaling-late' | 'ad' | 'ap' | 'cc-heavy';

export type ChampionRarity = 'gratuit' | 'commun' | 'rare' | 'tres-rare' | 'epique' | 'legendaire' | 'mythique';

export type DraftEvent = 'budget-illimite' | 'legendaire-only' | 'mythique-only';

export const DRAFT_EVENT_META: Record<DraftEvent, { label: string; description: string }> = {
  'budget-illimite': { label: 'Budget illimite', description: "Depensez sans compter pour cette draft." },
  'legendaire-only': { label: 'Legendaire only', description: 'Seuls les champions legendaires et mythiques sont proposes.' },
  'mythique-only': { label: 'Mythique only', description: 'Le lobby entier ne pioche que dans les champions mythiques.' },
};

export const RARITY_META: Record<ChampionRarity, { label: string; color: string; order: number }> = {
  gratuit: { label: 'Sbire', color: '#6b7684', order: -1 },
  commun: { label: 'Commun', color: '#cbd5e0', order: 0 },
  rare: { label: 'Rare', color: '#22e07d', order: 1 },
  'tres-rare': { label: 'Tres Rare', color: '#2f9dff', order: 2 },
  epique: { label: 'Epique', color: '#c65bff', order: 3 },
  legendaire: { label: 'Legendaire', color: '#ff9012', order: 4 },
  mythique: { label: 'Mythique', color: '#ef5da8', order: 5 },
};

export interface Champion {
  id: string;
  name: string;
  cost: number;
  roles: Role[];
  tags: ChampionTag[];
  ccScore: number;
  rarity: ChampionRarity;
}

export interface DraftFactorBreakdown {
  key: string;
  label: string;
  points: number;
}

export type ScenarioPhaseKind = 'lane' | 'skirmish' | 'objective' | 'teamfight' | 'macro';
export type ScenarioSide = 'A' | 'B';

export interface ScenarioPhase {
  minute: number;
  label: string;
  kind: ScenarioPhaseKind;
  text: string;
  favors: ScenarioSide;
  championId: string;
  opponentChampionId?: string;
}

export interface MatchScenario {
  seed: string;
  phases: ScenarioPhase[];
  winnerSide: ScenarioSide;
  closingLine: string;
}

export interface Perk {
  id: string;
  label: string;
  icon: IconName;
}

export interface DraftResult {
  playerId: string;
  totalScore: number;
  championIds: string[];
  factors: DraftFactorBreakdown[];
  isWinner: boolean;
  scenario?: MatchScenario;
  scenarioSide?: ScenarioSide;
  perks: Perk[];
}

export type StrategyCategoryId = 'playstyle' | 'macro' | 'itemization';

export interface StrategyOption {
  id: string;
  label: string;
  description: string;
}

export interface StrategyCategory {
  id: StrategyCategoryId;
  label: string;
  prompt: string;
  options: StrategyOption[];
}

export type StrategySelections = Partial<Record<StrategyCategoryId, string>>;

export const CLONE_PREFIX = 'clone:';
export function isCloneId(id: string): boolean {
  return id.startsWith(CLONE_PREFIX);
}
/** Extrait le vrai joueur clone a partir d'un id synthetique (voir CLONE_PREFIX cote backend). */
export function cloneSourceOf(id: string): string | undefined {
  if (!isCloneId(id)) return undefined;
  return id.slice(CLONE_PREFIX.length).split(':')[0];
}

export type DraftMatchStatus = 'drafting' | 'resolved';

/**
 * Un match du bracket, round par round. `playerBId` peut etre un id
 * synthetique de "clone" (voir isCloneId/cloneSourceOf) quand `isCloneMatch`
 * est vrai : le nombre de joueurs est impair, un joueur tombe seul dans son
 * tour et affronte une copie de la draft d'un autre joueur plutot qu'un bye
 * gratuit. Si le clone gagne, ca n'affecte jamais le vrai match du joueur
 * clone.
 */
export interface DraftMatchState {
  round: number;
  matchIndex: number;
  playerAId: string;
  playerBId: string;
  isCloneMatch: boolean;
  clonedFromPlayerId?: string;
  status: DraftMatchStatus;
  winnerId?: string;
  scenario?: MatchScenario;
  /** Budget/event tires INDEPENDAMMENT pour ce match precis (voir demande produit) : jamais partages avec les autres duels du meme round. */
  budget: number;
  event: DraftEvent | null;
}

export interface TournamentRoundState {
  round: number;
  matches: DraftMatchState[];
}

export interface TournamentProgress {
  rounds: TournamentRoundState[];
  currentRound: number;
  championId?: string;
}

export interface RoundMatchup {
  round: number;
  matchIndex: number;
  opponentId: string;
  isCloneMatch: boolean;
  clonedFromPlayerId?: string;
  /** Budget/event de CE match precis (voir DraftMatchState). */
  budget: number;
  event: DraftEvent | null;
}

/** Avancement "best effort" d'un joueur dans sa draft en cours (pas encore soumise), pour le mode spectateur en direct. */
export interface MatchDraftProgress {
  round: number;
  matchIndex: number;
  playerId: string;
  picks: Partial<Record<Role, string>>;
  strategySelections?: StrategySelections;
}
