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

@Injectable({ providedIn: "root" })
export class RoomService {
	private readonly _room = signal<Room | null>(null);
	private readonly _error = signal<string | null>(null);
	private readonly _lastGameStarted = signal<string | null>(null);
	private readonly _joinedMidGame = signal(false);
	private hasReceivedFirstState = false;
	/** Pseudo utilise pour le create/join en cours, pour pouvoir sauvegarder la session {code, pseudo} des reception du premier STATE (voir tryRejoin, appele au reload par RoomComponent). */
	private pendingPseudo: string | null = null;

	readonly room = this._room.asReadonly();
	readonly error = this._error.asReadonly();
	readonly lastGameStarted = this._lastGameStarted.asReadonly();
	/**
	 * True si on a rejoint la room alors qu'une manche tournait deja : le
	 * mini-jeu en cours n'a jamais recu notre etat initial (pool de
	 * champions, ordre de tour...) et resterait casse si on le montait quand
	 * meme. Repasse a false des que la manche/le segment suivant demarre.
	 */
	readonly joinedMidGame = this._joinedMidGame.asReadonly();

	readonly myId = computed(() => this.socket.id);
	readonly isHost = computed(() => {
		const room = this._room();
		return !!room && room.hostId === this.socket.id;
	});
	readonly players = computed<Player[]>(() => this._room()?.players ?? []);
	readonly sortedByScore = computed<Player[]>(() =>
		[...this.players()].sort((a, b) => b.score - a.score),
	);

	constructor(private readonly socket: SocketService) {
		this.socket.on<Room>(ROOM_EVENTS.STATE, (room) => {
			if (!this.hasReceivedFirstState) {
				this.hasReceivedFirstState = true;
				this._joinedMidGame.set(room.status === "in-game");
			}
			this._room.set(room);
			if (this.pendingPseudo) {
				localStorage.setItem(SESSION_KEY, JSON.stringify({ code: room.code, pseudo: this.pendingPseudo }));
			}
		});
		this.socket.on<{ message: string }>(ROOM_EVENTS.ERROR, (payload) =>
			this._error.set(payload.message),
		);
		this.socket.on<{ gameId: string }>(ROOM_EVENTS.GAME_STARTED, (payload) => {
			this._lastGameStarted.set(payload.gameId);
			this._joinedMidGame.set(false);
		});
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
