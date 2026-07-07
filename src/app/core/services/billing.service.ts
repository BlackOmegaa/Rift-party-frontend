import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { BACKEND_URL } from "./socket.service";
import { getOrCreateAnonId } from "./anon-id";

/** Redirige vers les pages hebergees Stripe (Checkout/Customer Portal) - aucune carte geree cote front. */
@Injectable({ providedIn: "root" })
export class BillingService {
	private readonly http = inject(HttpClient);

	async startCheckout(): Promise<void> {
		// Ramene le joueur la ou il a lance le paiement (ex. sa room) plutot que
		// de le rediriger de force vers /account apres coup. L'anonId part avec :
		// il transite par les metadata Stripe pour que le webhook de paiement
		// puisse relier la conversion au visiteur (funnel + source d'acquisition).
		const returnPath = window.location.pathname;
		const res = await firstValueFrom(
			this.http.post<{ url: string }>(`${BACKEND_URL}/billing/checkout-session`, {
				returnPath,
				anonId: getOrCreateAnonId(),
			}),
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
