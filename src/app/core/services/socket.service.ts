import { Injectable, signal } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { environment } from "../../../environments/environment";
import { getOrCreateAnonId } from "./anon-id";
import { getAcquisitionSource } from "./acquisition";

// Localhost en dev (`ng serve`), URL Railway en prod : bascule automatique via
// fileReplacements (angular.json), plus besoin de commenter/decommenter a la main.
export const BACKEND_URL = environment.backendUrl;

/**
 * Wrapper unique autour de socket.io-client. Tous les services (RoomService,
 * DraftService, futurs mini-jeux) passent par lui : jamais d'instance
 * `io(...)` ailleurs dans l'app.
 */
@Injectable({ providedIn: "root" })
export class SocketService {
	private socket: Socket = io(BACKEND_URL, {
		autoConnect: true,
		transports: ["websocket"],
		// Explicite plutot que de compter sur les defauts socket.io-client : une
		// coupure reseau (wifi, veille telephone...) doit reconnecter tout seul,
		// avec un backoff qui ne spamme pas le serveur.
		reconnection: true,
		reconnectionAttempts: Infinity,
		reconnectionDelay: 1000,
		reconnectionDelayMax: 5000,
		query: { anonId: getOrCreateAnonId(), source: getAcquisitionSource() ?? "" },
	});

	/** Reflete l'etat de transport reel du socket, pour un feedback UI (bandeau "reconnexion..."). */
	private readonly _connected = signal(this.socket.connected);
	readonly connected = this._connected.asReadonly();

	/**
	 * socket.id courant, expose en signal : socket.io genere un NOUVEL id a
	 * chaque reconnexion, un simple getter fige donc tous les computed qui en
	 * dependent (myId, isHost, isMyTurn...). On garde volontairement l'ancien
	 * id pendant une deconnexion : l'etat de room encore affiche le reference,
	 * le vider casserait les comparaisons (badge "moi", scores) le temps de la reco.
	 */
	private readonly _id = signal<string | undefined>(this.socket.id);
	readonly id = this._id.asReadonly();

	constructor() {
		this.socket.on("connect", () => {
			this._connected.set(true);
			this._id.set(this.socket.id);
		});
		this.socket.on("disconnect", () => this._connected.set(false));
	}

	emit<T = unknown>(event: string, payload?: T): void {
		this.socket.emit(event, payload);
	}

	on<T = unknown>(event: string, handler: (payload: T) => void): void {
		this.socket.on(event, handler as (...args: unknown[]) => void);
	}

	off(event: string, handler?: (...args: unknown[]) => void): void {
		this.socket.off(event, handler);
	}
}
