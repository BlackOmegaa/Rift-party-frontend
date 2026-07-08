import { Injectable, computed, signal } from "@angular/core";
import { SocketService } from "./socket.service";
import { Room } from "../models/room.model";
import { Player } from "../models/player.model";

const ROOM_EVENTS = {
	CREATE: "room:create",
	JOIN: "room:join",
	LEAVE: "room:leave",
	RENAME: "room:rename",
	START_GAME: "room:start-game",
	END_GAME: "room:end-game",
	UPDATE_SETTINGS: "room:update-settings",
	RESTART_GAME: "room:restart-game",
	GAME_RESTARTED: "room:game-restarted",
	STATE: "room:state",
	PLAYER_JOINED: "room:player-joined",
	PLAYER_LEFT: "room:player-left",
	ERROR: "room:error",
	GAME_STARTED: "room:game-started",
	ROUND_FINISHED: "room:round-finished",
} as const;

const PARTY_EVENTS = {
	START: "party:start",
	NEXT: "party:next",
	SEGMENT_COMPLETE: "party:segment-complete",
	FINISH: "party:finish",
} as const;

/**
 * Etat de la room courante, expose en signals. Un seul point de verite
 * pour tous les composants (HomeComponent, RoomComponent, mini-jeux).
 */
const SESSION_KEY = "rift-party-session";

/** Retry du re-join automatique post-reconnexion (voir constructor) : apres une micro-coupure, l'ancien socket n'a pas encore timeout cote serveur (~20-45s) et le join repond "pseudo deja pris". Cadence 3s, abandon apres 90s (large marge sur le timeout serveur). */
const AUTO_REJOIN_RETRY_MS = 3000;
const AUTO_REJOIN_MAX_MS = 90_000;

@Injectable({ providedIn: "root" })
export class RoomService {
	private readonly _room = signal<Room | null>(null);
	private readonly _error = signal<string | null>(null);
	private readonly _lastGameStarted = signal<string | null>(null);
	private readonly _joinedMidGame = signal(false);
	private hasReceivedFirstState = false;
	/** Pseudo utilise pour le create/join en cours, pour pouvoir sauvegarder la session {code, pseudo} des reception du premier STATE (voir tryRejoin, appele au reload par RoomComponent). */
	private pendingPseudo: string | null = null;
	private errorAutoClearTimer: ReturnType<typeof setTimeout> | null = null;

	/** Etat du retry de re-join automatique post-reconnexion (voir startAutoRejoin) : session a re-tenter, timer du prochain essai, date limite d'abandon. Null/false = aucun retry en cours (cas nominal, y compris pour un join manuel depuis la home). */
	private autoRejoinSession: { code: string; pseudo: string } | null = null;
	private autoRejoinTimer: ReturnType<typeof setTimeout> | null = null;
	private autoRejoinDeadline: number | null = null;
	private readonly _autoRejoining = signal(false);

	readonly room = this._room.asReadonly();
	readonly error = this._error.asReadonly();
	readonly lastGameStarted = this._lastGameStarted.asReadonly();
	/** True si on a besoin d'un feedback "reconnexion..." : transport socket tombe alors qu'on etait dans une room (la reco est automatique via socket.io), OU re-join automatique encore en cours apres la reco (retry "pseudo deja pris", voir startAutoRejoin). */
	readonly reconnecting = computed(() => (!this.socket.connected() || this._autoRejoining()) && !!this._room());
	/**
	 * True si on a rejoint la room alors qu'une manche tournait deja : le
	 * mini-jeu en cours n'a jamais recu notre etat initial (pool de
	 * champions, ordre de tour...) et resterait casse si on le montait quand
	 * meme. Repasse a false des que la manche/le segment suivant demarre.
	 */
	readonly joinedMidGame = this._joinedMidGame.asReadonly();

	// `socket.id` est un signal (mis a jour a chaque 'connect') : ces computed
	// sont donc bien recalcules apres une reconnexion (nouveau socket.id).
	readonly myId = computed(() => this.socket.id());
	readonly isHost = computed(() => {
		const room = this._room();
		return !!room && room.hostId === this.socket.id();
	});
	readonly players = computed<Player[]>(() => this._room()?.players ?? []);
	readonly sortedByScore = computed<Player[]>(() =>
		[...this.players()].sort((a, b) => b.score - a.score),
	);

	constructor(private readonly socket: SocketService) {
		this.socket.on<Room>(ROOM_EVENTS.STATE, (room) => {
			// Un state recu = on est bien dans la room : le re-join automatique (s'il tournait) a abouti.
			this.stopAutoRejoin();
			if (!this.hasReceivedFirstState) {
				this.hasReceivedFirstState = true;
				this._joinedMidGame.set(room.status === "in-game");
			}
			this._room.set(room);
			if (this.pendingPseudo) {
				localStorage.setItem(SESSION_KEY, JSON.stringify({ code: room.code, pseudo: this.pendingPseudo }));
			}
		});
		this.socket.on<{ message: string }>(ROOM_EVENTS.ERROR, (payload) => {
			// Re-join automatique post-reconnexion en cours : "pseudo deja pris"
			// veut juste dire que l'ancien socket n'a pas encore timeout cote
			// serveur. On retente en silence (pas de toast a chaque tentative)
			// au lieu de laisser une UI zombie. Un join MANUEL depuis la home
			// n'est jamais concerne (autoRejoinSession est null dans ce cas).
			if (this.autoRejoinSession && /pseudo/i.test(payload.message) && /pris/i.test(payload.message)) {
				this.scheduleAutoRejoinRetry();
				return;
			}
			this.showError(payload.message);
		});
		this.socket.on<{ gameId: string }>(ROOM_EVENTS.GAME_STARTED, (payload) => {
			this._lastGameStarted.set(payload.gameId);
			this._joinedMidGame.set(false);
		});
		// Reco transport (wifi coupe puis revenu) : socket.io reconnecte tout seul
		// mais cote serveur c'est une toute nouvelle connexion (nouveau socket.id),
		// on a donc ete silencieusement retire de la room. On retente un JOIN avec
		// la session sauvegardee plutot que de laisser le joueur bloque.
		this.socket.on("connect", () => {
			const room = this._room();
			if (!room) return;
			const raw = localStorage.getItem(SESSION_KEY);
			if (!raw) return;
			try {
				const session = JSON.parse(raw) as { code: string; pseudo: string };
				if (session.code?.toUpperCase() === room.code.toUpperCase()) {
					this.startAutoRejoin({ code: room.code, pseudo: session.pseudo });
				}
			} catch {
				/* session corrompue, on abandonne la reco silencieusement */
			}
		});
	}

	/** Affiche une erreur serveur avec auto-dismiss : evite un message (ex: "Room introuvable") qui reste affiche indefiniment si le joueur ne retente pas tout de suite. */
	private showError(message: string): void {
		this._error.set(message);
		if (this.errorAutoClearTimer) clearTimeout(this.errorAutoClearTimer);
		this.errorAutoClearTimer = setTimeout(() => this._error.set(null), 6000);
	}

	/**
	 * Lance (ou relance apres une nouvelle reco) le re-join automatique
	 * post-reconnexion. Tant qu'il est actif, les erreurs "pseudo deja pris"
	 * sont interceptees et le join est retente toutes les AUTO_REJOIN_RETRY_MS
	 * (voir le handler ERROR du constructor), jusqu'a reception d'un
	 * room:state, un leaveRoom, ou l'expiration de AUTO_REJOIN_MAX_MS.
	 */
	private startAutoRejoin(session: { code: string; pseudo: string }): void {
		// Deadline conservee si un retry tourne deja (reconnexions en rafale) :
		// on ne repousse pas l'abandon indefiniment.
		if (!this.autoRejoinSession) this.autoRejoinDeadline = Date.now() + AUTO_REJOIN_MAX_MS;
		this.autoRejoinSession = session;
		this._autoRejoining.set(true);
		this.joinRoom(session.code, session.pseudo);
	}

	/** Programme la prochaine tentative du re-join automatique, ou abandonne (avec une erreur visible) si la deadline est depassee. */
	private scheduleAutoRejoinRetry(): void {
		if (this.autoRejoinTimer) clearTimeout(this.autoRejoinTimer);
		this.autoRejoinTimer = null;
		if (!this.autoRejoinSession || !this.autoRejoinDeadline || Date.now() >= this.autoRejoinDeadline) {
			this.stopAutoRejoin();
			this.showError("Reconnexion a la room impossible. Recharge la page pour reessayer.");
			return;
		}
		this.autoRejoinTimer = setTimeout(() => {
			this.autoRejoinTimer = null;
			const session = this.autoRejoinSession;
			if (!session) return;
			// Transport retombe entre-temps : on attend le prochain 'connect'
			// (qui re-emettra le join) plutot que d'empiler des emits que
			// socket.io bufferiserait puis enverrait en rafale.
			if (!this.socket.connected()) {
				this.scheduleAutoRejoinRetry();
				return;
			}
			this.joinRoom(session.code, session.pseudo);
		}, AUTO_REJOIN_RETRY_MS);
	}

	/** Coupe le re-join automatique : join abouti (room:state), room quittee, ou abandon apres deadline. */
	private stopAutoRejoin(): void {
		if (this.autoRejoinTimer) clearTimeout(this.autoRejoinTimer);
		this.autoRejoinTimer = null;
		this.autoRejoinSession = null;
		this.autoRejoinDeadline = null;
		this._autoRejoining.set(false);
	}

	createRoom(pseudo: string): void {
		this._error.set(null);
		this.pendingPseudo = pseudo;
		this.socket.emit(ROOM_EVENTS.CREATE, { pseudo });
	}

	joinRoom(code: string, pseudo: string, viaInvite = false): void {
		this._error.set(null);
		this.pendingPseudo = pseudo;
		this.socket.emit(ROOM_EVENTS.JOIN, { code, pseudo, viaInvite });
	}

	/** A appeler quand le joueur copie le lien d'invitation (voir room.component.ts copyInviteLink), pour la stat de viralite. */
	notifyInviteGenerated(): void {
		this.socket.emit("room:invite-generated");
	}

	leaveRoom(): void {
		this.stopAutoRejoin();
		this.socket.emit(ROOM_EVENTS.LEAVE);
		this._room.set(null);
		this._joinedMidGame.set(false);
		this.hasReceivedFirstState = false;
		localStorage.removeItem(SESSION_KEY);
	}

	/** Tente de rejoindre automatiquement la room `code` apres un reload (voir RoomComponent) : la session {code, pseudo} n'est ecrite qu'apres un STATE recu, donc uniquement si on etait vraiment dans cette room. Le pseudo repart avec un score a 0 (nouveau Player cote backend), c'est le compromis accepte plutot que de rester bloque sur "Aucune room active". */
	tryRejoin(code: string): boolean {
		if (this._room()) return false;
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return false;
		try {
			const session = JSON.parse(raw) as { code: string; pseudo: string };
			if (!session.pseudo || session.code?.toUpperCase() !== code.toUpperCase()) return false;
			this.joinRoom(code, session.pseudo);
			return true;
		} catch {
			return false;
		}
	}

	rename(pseudo: string): void {
		this.socket.emit(ROOM_EVENTS.RENAME, { pseudo });
	}

	/** `forceEvent` : reserve au controle dev de Draft Battle (voir room.component.ts), pour tester un event special sans attendre le tirage aleatoire. */
	startGame(gameId: string, forceEvent?: string): void {
		this.socket.emit(ROOM_EVENTS.START_GAME, { gameId, forceEvent });
	}

	updateSettings(patch: { roundTimeSec?: number; roundsByGame?: Record<string, number>; loldleWordLength?: number | null }): void {
		this.socket.emit(ROOM_EVENTS.UPDATE_SETTINGS, patch);
	}

	restartGame(gameId: string): void {
		this.socket.emit(ROOM_EVENTS.RESTART_GAME, { gameId });
	}

	onGameRestarted(handler: (payload: { gameId: string }) => void): void {
		this.socket.on<{ gameId: string }>(ROOM_EVENTS.GAME_RESTARTED, handler);
	}

	startMix(playlist: string[]): void {
		this.socket.emit(PARTY_EVENTS.START, { playlist });
	}

	nextMixSegment(): void {
		this.socket.emit(PARTY_EVENTS.NEXT);
	}

	submitMixSegment(points: number, summary: string): void {
		this.socket.emit(PARTY_EVENTS.SEGMENT_COMPLETE, { points, summary });
	}

	finishMix(): void {
		this.socket.emit(PARTY_EVENTS.FINISH);
	}

	endGame(summary = "Manche interrompue."): void {
		this.socket.emit(ROOM_EVENTS.END_GAME, { summary });
	}

	clearError(): void {
		this._error.set(null);
	}
}
