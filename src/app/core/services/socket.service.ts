import { Injectable } from "@angular/core";
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
		query: { anonId: getOrCreateAnonId(), source: getAcquisitionSource() ?? "" },
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
