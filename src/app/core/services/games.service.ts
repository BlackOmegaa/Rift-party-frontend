import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { MiniGame } from "../models/room.model";

// Localhost en dev (`ng serve`), URL Railway en prod : bascule automatique via
// fileReplacements (angular.json), plus besoin de commenter/decommenter a la main.
const API_URL = environment.backendUrl;

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
