export type BrumeRole = 'warwick' | 'fiddlesticks' | 'thresh' | 'ashe' | 'poro' | 'kindred';
export type BrumeTeam = 'predators' | 'circle' | 'solo';
export type BrumePhase = 'reveal' | 'night' | 'day' | 'vote' | 'results';

export interface BrumePlayerRef {
  id: string;
  pseudo: string;
}

export type BrumeNightActionType =
  | 'consommer'
  | 'effroi'
  | 'mark_fiddlesticks'
  | 'protect'
  | 'scout'
  | 'huddle'
  | 'mark_kindred'
  | 'hunt';

export type BrumeDeathCause = 'consommer' | 'fiddlesticks' | 'kindred' | 'vote';

export interface BrumeDeathRecord {
  playerId: string;
  pseudo: string;
  cause: BrumeDeathCause;
}

export interface BrumeNightRecap {
  day: number;
  deaths: BrumeDeathRecord[];
  bloodTracePseudo: string | null;
  silencedPseudos: string[];
  poroWatch: { targetPseudo: string; dangerDetected: boolean } | null;
}

export type BrumeChatChannel = 'pack' | 'assembly';
export type BrumeChatKind = 'text' | 'vote' | 'system' | 'reaction';

export interface BrumeChatMessage {
  id: string;
  channel: BrumeChatChannel;
  kind: BrumeChatKind;
  playerId: string | null;
  pseudo: string | null;
  text: string;
  createdAt: number;
}

export interface BrumeVoteProgress {
  ready: number;
  total: number;
  votes: Record<string, string>;
}

export interface BrumeResult {
  winner: 'predators' | 'circle' | 'kindred';
  summary: string;
  roles: Record<string, { role: BrumeRole; team: BrumeTeam; pseudo: string; alive: boolean }>;
  history: BrumeNightRecap[];
  scores: Record<string, number>;
}

export interface BrumeAsheClue {
  targetId: string;
  targetPseudo: string;
  result: 'ombre' | 'clarte';
}

/** Coequipier d'equipe "predateurs" (les mechants) : role precis revele pour se reconnaitre entre eux. */
export interface BrumeTeammateRef {
  id: string;
  pseudo: string;
  role: BrumeRole;
}

export interface BrumeSnapshot {
  active: boolean;
  phase: BrumePhase;
  dayNumber: number;
  players: BrumePlayerRef[];
  alivePlayerIds: string[];
  myRole: BrumeRole | null;
  myTeam: BrumeTeam | null;
  myChampion: string | null;
  myKit: string | null;
  myTeammates: BrumeTeammateRef[];
  myRevealReady: boolean;
  revealProgress: { ready: number; total: number };
  phaseDeadline: number | null;
  phaseDurationMs: number;
  myNightActionSubmitted: boolean;
  myFiddlesticksPending: boolean;
  myKindredMarqueId: string | null;
  myKindredHuntStreak: number;
  myAsheClue: BrumeAsheClue | null;
  lastDawn: BrumeNightRecap | null;
  packChat: BrumeChatMessage[];
  dayChat: BrumeChatMessage[];
  myVote: string | null;
  voteProgress: BrumeVoteProgress;
  results: BrumeResult | null;
}

export interface BrumeRevealPayload {
  role: BrumeRole;
  team: BrumeTeam;
  champion: string;
  kit: string;
  teammates: BrumeTeammateRef[];
}

/** Libelles d'affichage cote client : le contenu de jeu (kit, mecaniques) vient du serveur via REVEAL. */
export const BRUME_ROLE_LABELS: Record<BrumeRole, string> = {
  warwick: 'Warwick',
  fiddlesticks: 'Fiddlesticks',
  thresh: 'Thresh',
  ashe: 'Ashe',
  poro: 'Poro',
  kindred: 'Kindred',
};

export const BRUME_TEAM_LABELS: Record<BrumeTeam, string> = {
  predators: 'Prédateurs',
  circle: 'Cercle',
  solo: 'Solo',
};

/**
 * Glossaire des roles : contrairement au kit de MON role (secret, vient du
 * serveur via REVEAL), ce texte est la regle publique du mode - identique
 * pour tout le monde, donc statique cote client. Sert au panneau "roles"
 * consultable a tout moment sans reveler qui a quel role.
 */
export const BRUME_ROLE_META: Record<BrumeRole, { team: BrumeTeam; champion: string; kit: string }> = {
  warwick: {
    team: 'predators',
    champion: 'Warwick',
    kit: "Chaque nuit : Morsure (élimine la cible ; à l'aube, une odeur de sang trompeuse pointe vers un survivant au hasard, jamais la vraie victime) ou Effroi (fait taire la cible le jour suivant).",
  },
  fiddlesticks: {
    team: 'predators',
    champion: 'Fiddlesticks',
    kit: "Repère une cible en silence ; si elle survit non protégée, Crowstorm la frappe à l'aube suivante.",
  },
  thresh: {
    team: 'circle',
    champion: 'Thresh',
    kit: 'Chaque nuit, protège un joueur avec sa Lanterne : la cible survit à toute élimination cette nuit-là.',
  },
  ashe: {
    team: 'circle',
    champion: 'Ashe',
    kit: 'Chaque nuit, scoute un joueur avec Hawkshot : indice fiable à 100% (Ombre / Clarté).',
  },
  poro: {
    team: 'circle',
    champion: 'Poro',
    kit: "Chaque nuit, participe au Blottissement collectif du Cercle : avec les autres Poros, vote pour un joueur à surveiller. À l'aube, le groupe apprend si un danger rôdait vraiment près de la cible du vote majoritaire (mais pas qui l'a tué ni pourquoi).",
  },
  kindred: {
    team: 'solo',
    champion: 'Kindred',
    kit: "Marque une cible en secret. Deux nuits de chasse ininterrompue suffisent à gagner seul, peu importe le camp vainqueur.",
  },
};
