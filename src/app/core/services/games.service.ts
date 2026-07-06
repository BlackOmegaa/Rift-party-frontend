import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { MiniGame } from "../models/room.model";

//const API_URL = "http://localhost:3050";
const API_URL = "https://lol-game-production.up.railway.app";

/**
 * Recupere le catalogue de mini-jeux disponibles (issu du GamesRegistry backend).
 * Un nouveau mini-jeu ajoute cote backend apparait ici automatiquement, sans
 * modification de ce service.
 */
@Injectable({ providedIn: "root" })
export class GamesService {
	private readonly http = inject(HttpClient);

	list(): Observable<MiniGame[]> {
		return this.http.get<MiniGame[]>(`${API_URL}/games`);
	}
}
