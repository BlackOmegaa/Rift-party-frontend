import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { BACKEND_URL } from "./socket.service";

const TOKEN_KEY = "rift-party-player-token";

export interface PlayerProfile {
	id: string;
	email: string;
	isSubscriber: boolean;
}

/**
 * Compte joueur optionnel : sert uniquement a porter un abonnement a travers
 * les sessions/navigateurs. Ne bloque jamais le jeu anonyme (anonId reste le
 * mode par defaut, voir anon-id.ts) - se connecter est un plus, jamais requis.
 */
@Injectable({ providedIn: "root" })
export class PlayerAuthService {
	private readonly http = inject(HttpClient);

	readonly isAuthenticated = signal<boolean>(!!this.getToken());
	readonly profile = signal<PlayerProfile | null>(null);

	constructor() {
		if (this.getToken()) void this.refreshProfile();
	}

	getToken(): string | null {
		return localStorage.getItem(TOKEN_KEY);
	}

	async register(email: string, password: string): Promise<void> {
		const res = await firstValueFrom(
			this.http.post<{ token: string }>(`${BACKEND_URL}/player-auth/register`, { email, password }),
		);
		this.setToken(res.token);
		await this.refreshProfile();
	}

	async login(email: string, password: string): Promise<void> {
		const res = await firstValueFrom(
			this.http.post<{ token: string }>(`${BACKEND_URL}/player-auth/login`, { email, password }),
		);
		this.setToken(res.token);
		await this.refreshProfile();
	}

	async refreshProfile(): Promise<void> {
		try {
			const profile = await firstValueFrom(this.http.get<PlayerProfile>(`${BACKEND_URL}/player-auth/me`));
			this.profile.set(profile);
		} catch (err) {
			// Uniquement sur 401 (token expire/invalide) : une erreur serveur
			// transitoire (500, reseau...) ne doit jamais deconnecter quelqu'un
			// dont le token est encore parfaitement valide.
			if (err instanceof HttpErrorResponse && err.status === 401) this.logout();
		}
	}

	logout(): void {
		localStorage.removeItem(TOKEN_KEY);
		this.isAuthenticated.set(false);
		this.profile.set(null);
	}

	private setToken(token: string): void {
		localStorage.setItem(TOKEN_KEY, token);
		this.isAuthenticated.set(true);
	}
}
