import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { BACKEND_URL } from "./socket.service";

/** Redirige vers les pages hebergees Stripe (Checkout/Customer Portal) - aucune carte geree cote front. */
@Injectable({ providedIn: "root" })
export class BillingService {
	private readonly http = inject(HttpClient);

	async startCheckout(): Promise<void> {
		const res = await firstValueFrom(
			this.http.post<{ url: string }>(`${BACKEND_URL}/billing/checkout-session`, {}),
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
