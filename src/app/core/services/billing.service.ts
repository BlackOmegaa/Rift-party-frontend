import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { BACKEND_URL } from "./socket.service";

/** Redirige vers les pages hebergees Stripe (Checkout/Customer Portal) - aucune carte geree cote front. */
@Injectable({ providedIn: "root" })
export class BillingService {
	private readonly http = inject(HttpClient);

	async startCheckout(): Promise<void> {
		// Ramene le joueur la ou il a lance le paiement (ex. sa room) plutot que
		// de le rediriger de force vers /account apres coup.
		const returnPath = window.location.pathname;
		const res = await firstValueFrom(
			this.http.post<{ url: string }>(`${BACKEND_URL}/billing/checkout-session`, { returnPath }),
		);
		window.location.href = res.url;
	}

	async openPortal(): Promise<void> {
		const res = await firstValueFrom(
			this.http.post<{ url: string }>(`${BACKEND_URL}/billing/portal-session`, {}),
		);
		window.location.href = res.url;
	}
}
