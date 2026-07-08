import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { BACKEND_URL } from "./socket.service";

const TOKEN_KEY = "rift-party-player-token";
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 8; // ~16s : le webhook Stripe arrive presque toujours en 1-3s, marge large.

/**
 * Lecture pure du token (meme cle que PlayerAuthService.getToken()), sans
 * injection du service. A utiliser depuis un autre service qui a besoin du
 * token SANS declarer de dependance sur PlayerAuthService : l'injecter
 * creerait un cycle, PlayerAuthService declenchant lui-meme un appel HTTP a
 * la construction (refreshProfile), qui repasse par playerAuthInterceptor,
 * qui re-injecte PlayerAuthService pendant que sa propre construction est
 * encore en cours (NG0200 des que PlayerAuthService n'a pas deja ete
 * construit par un autre consommateur avant).
 */
export function getPlayerToken(): string | null {
	return localStorage.getItem(TOKEN_KEY);
}

export interface PlayerProfile {
	id: string;
	email: string;
	isSubscriber: boolean;
	/** Date du tout premier abonnement (ISO 8601), null si jamais abonne. */
	supporterSince: string | null;
	/** Vrai si abonne avant le lancement des avantages en jeu. */
	isDayOneSupporter: boolean;
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
	/** True des que le premier appel a /me est retombe (succes OU echec) - permet de distinguer "en cours de chargement" de "charge mais vide/en erreur", pour ne jamais afficher un spinner infini. */
	readonly profileLoaded = signal<boolean>(false);

	constructor() {
		if (this.getToken()) void this.refreshProfile();
		else this.profileLoaded.set(true);
	}

	getToken(): string | null {
		return getPlayerToken();
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

	/** Demande d'email de reinitialisation. Le backend repond toujours 200 (anti-enumeration). */
	async requestPasswordReset(email: string): Promise<void> {
		await firstValueFrom(this.http.post(`${BACKEND_URL}/player-auth/forgot-password`, { email }));
	}

	/** Change le mot de passe via le token recu par email, puis connecte directement. */
	async resetPassword(token: string, password: string): Promise<void> {
		const res = await firstValueFrom(
			this.http.post<{ token: string }>(`${BACKEND_URL}/player-auth/reset-password`, { token, password }),
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
		} finally {
			this.profileLoaded.set(true);
		}
	}

	/**
	 * Le webhook Stripe arrive de facon asynchrone apres le retour de checkout :
	 * on sonde /me au lieu d'un seul refresh, avec une sortie propre (booleen)
	 * plutot qu'un signal local a chaque appelant. Reutilise par n'importe quelle
	 * page qui gere `?checkout=success` (voir CheckoutConfirmationComponent).
	 */
	async pollUntilSubscribed(): Promise<boolean> {
		for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
			await this.refreshProfile();
			if (this.profile()?.isSubscriber) return true;
		}
		return false;
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
