import { Injectable, signal } from "@angular/core";
import { SocketService } from "./socket.service";
import {
	Champion,
	DraftEvent,
	DraftMatchState,
	DraftResult,
	MatchDraftProgress,
	Role,
	RoundMatchup,
	StrategyCategory,
	StrategySelections,
	TournamentProgress,
} from "../models/draft.model";

const DRAFT_EVENTS = {
	START: "draft:start",
	SUBMIT: "draft:submit",
	PLAYER_READY: "draft:player-ready",
	RESULTS: "draft:results",
	BRACKET_STATE: "draft:bracket-state",
	ROUND_MATCHUP: "draft:round-matchup",
	MATCH_RESOLVED: "draft:match-resolved",
	DRAFT_PROGRESS: "draft:draft-progress",
	MATCH_DRAFT_PROGRESS: "draft:match-draft-progress",
	REQUEST_STATE: "draft:request-state",
	MATCH_SEEN: "draft:match-seen",
	MATCH_REVEALED: "draft:match-revealed",
} as const;

/**
 * Etat du mini-jeu Draft Battle, en signals. Suit le meme pattern que
 * RoomService : c'est ce pattern qu'un futur mini-jeu (Guess The Champion,
 * Gartic LoL...) doit reproduire dans son propre service.
 */
@Injectable({ providedIn: "root" })
export class DraftService {
	private readonly _budget = signal(0);
	private readonly _championsPool = signal<Champion[]>([]);
	private readonly _strategyCategories = signal<StrategyCategory[]>([]);
	private readonly _readyPlayerIds = signal<Set<string>>(new Set());
	private readonly _results = signal<DraftResult[] | null>(null);

	/** Tournoi (4+ joueurs) : etat complet du bracket, rediffuse a chaque changement. */
	private readonly _tournamentProgress = signal<TournamentProgress | null>(null);
	/** Contre qui je joue ce round (undefined = pas encore recu / tournoi termine). */
	private readonly _myMatchup = signal<RoundMatchup | null>(null);
	/** Tous les matchs deja resolus cette session, cle "round-matchIndex" : sert au visionnage libre (mon match + spectateur). */
	private readonly _resolvedMatches = signal<Map<string, DraftMatchState>>(new Map());
	/** Avancement en direct des matchs pas encore resolus, cle "round-matchIndex" -> playerId -> {picks, strategySelections}. "Best effort", pas de resync garanti. */
	private readonly _liveDraftProgress = signal<
		Map<string, Record<string, { picks: Partial<Record<Role, string>>; strategySelections?: StrategySelections }>>
	>(new Map());
	/** Cles ("single" ou "round-matchIndex") deja revelees a toute la room : tant qu'une cle n'y est pas, personne ne doit voir le vainqueur de ce duel. */
	private readonly _revealedKeys = signal<Set<string>>(new Set());
	/** Event special rarissime tire par le serveur au lancement de la draft (budget illimite / legendaire ou mythique only). */
	private readonly _event = signal<DraftEvent | null>(null);

	readonly budget = this._budget.asReadonly();
	readonly event = this._event.asReadonly();
	readonly championsPool = this._championsPool.asReadonly();
	readonly strategyCategories = this._strategyCategories.asReadonly();
	readonly readyPlayerIds = this._readyPlayerIds.asReadonly();
	readonly results = this._results.asReadonly();
	readonly tournamentProgress = this._tournamentProgress.asReadonly();
	readonly myMatchup = this._myMatchup.asReadonly();
	readonly resolvedMatches = this._resolvedMatches.asReadonly();
	readonly liveDraftProgress = this._liveDraftProgress.asReadonly();

	constructor(private readonly socket: SocketService) {
		this.socket.on<{
			budget: number;
			championsPool: Champion[];
			strategyCategories: StrategyCategory[];
			event?: DraftEvent | null;
		}>(DRAFT_EVENTS.START, (payload) => {
			this._budget.set(payload.budget);
			this._championsPool.set(payload.championsPool);
			this._strategyCategories.set(payload.strategyCategories ?? []);
			this._event.set(payload.event ?? null);
			this._readyPlayerIds.set(new Set());
			this._results.set(null);
			this._tournamentProgress.set(null);
			this._myMatchup.set(null);
			this._resolvedMatches.set(new Map());
			this._liveDraftProgress.set(new Map());
			this._revealedKeys.set(new Set());
			// Si ce `draft:start` est en fait un resync (re-join spurieux en plein
			// tournoi, cf. reconnexion socket), on se retrouve immediatement plutot
			// que de rester bloque avec un etat de tournoi vide.
			this.requestState();
		});

		this.socket.on<{ playerId: string }>(DRAFT_EVENTS.PLAYER_READY, (payload) => {
			this._readyPlayerIds.update((set) => new Set(set).add(payload.playerId));
		});

		this.socket.on<{ results: DraftResult[] }>(DRAFT_EVENTS.RESULTS, (payload) => {
			this._results.set(payload.results);
		});

		this.socket.on<TournamentProgress>(DRAFT_EVENTS.BRACKET_STATE, (payload) => {
			this._tournamentProgress.set(payload);
		});

		this.socket.on<RoundMatchup>(DRAFT_EVENTS.ROUND_MATCHUP, (payload) => {
			this._myMatchup.set(payload);
			this._readyPlayerIds.set(new Set());
		});

		this.socket.on<DraftMatchState>(DRAFT_EVENTS.MATCH_RESOLVED, (payload) => {
			this._resolvedMatches.update((map) => {
				const next = new Map(map);
				next.set(`${payload.round}-${payload.matchIndex}`, payload);
				return next;
			});
		});

		this.socket.on<MatchDraftProgress>(DRAFT_EVENTS.MATCH_DRAFT_PROGRESS, (payload) => {
			this._liveDraftProgress.update((map) => {
				const key = `${payload.round}-${payload.matchIndex}`;
				const next = new Map(map);
				next.set(key, {
					...next.get(key),
					[payload.playerId]: { picks: payload.picks, strategySelections: payload.strategySelections },
				});
				return next;
			});
		});

		this.socket.on<{ key: string }>(DRAFT_EVENTS.MATCH_REVEALED, (payload) => {
			this._revealedKeys.update((set) => new Set(set).add(payload.key));
		});
	}

	isRevealed(key: string): boolean {
		return this._revealedKeys().has(key);
	}

	/** Signale que j'ai fini de regarder la cinematique de ce duel (cle "single" ou "round-matchIndex"). */
	matchSeen(key: string): void {
		this.socket.emit(DRAFT_EVENTS.MATCH_SEEN, { key });
	}

	submitDraft(championIds: string[], rerollsUsed = 0, strategySelections: StrategySelections = {}): void {
		this.socket.emit(DRAFT_EVENTS.SUBMIT, { championIds, rerollsUsed, strategySelections });
	}

	/** "Best effort" : signale mes picks + choix de strategie en cours pour que les spectateurs de mon match puissent les voir se former en direct. */
	reportDraftProgress(picks: Partial<Record<Role, string>>, strategySelections?: StrategySelections): void {
		this.socket.emit(DRAFT_EVENTS.DRAFT_PROGRESS, { picks, strategySelections });
	}

	/** Redemande mon etat de tournoi (bracket + mon matchup courant) : resync si je soupconne d'avoir rate un broadcast. */
	requestState(): void {
		this.socket.emit(DRAFT_EVENTS.REQUEST_STATE);
	}

	reset(): void {
		this._results.set(null);
		this._readyPlayerIds.set(new Set());
		this._tournamentProgress.set(null);
		this._myMatchup.set(null);
		this._resolvedMatches.set(new Map());
		this._liveDraftProgress.set(new Map());
		this._revealedKeys.set(new Set());
	}
}
