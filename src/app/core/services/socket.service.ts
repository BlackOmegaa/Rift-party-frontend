import { Injectable } from "@angular/core";
import { io, Socket } from "socket.io-client";
import { getOrCreateAnonId } from "./anon-id";

//export const BACKEND_URL = "http://localhost:3050";
export const BACKEND_URL = "https://rift-party-backend-production.up.railway.app";

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
		query: { anonId: getOrCreateAnonId() },
	});

	get id(): string | undefined {
		return this.socket.id;
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
