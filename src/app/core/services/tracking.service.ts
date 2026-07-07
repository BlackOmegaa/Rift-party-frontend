import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BACKEND_URL } from "./socket.service";
import { getOrCreateAnonId } from "./anon-id";

const OPTOUT_KEY = "rift-party-analytics-optout";

export type FunnelKind = "SUBSCRIPTION" | "DONATION";
/** Seuls les pas cote client ; CHECKOUT_STARTED et COMPLETED sont enregistres par le backend (source fiable). */
export type ClientFunnelStep = "OFFER_VIEWED" | "CTA_CLICKED" | "CHECKOUT_CANCELLED";

/**
 * Appareil de l'equipe (admin/dev) : plus aucun event de funnel envoye depuis
 * ce navigateur. Pose automatiquement a l'ouverture du dashboard admin, qui
 * marque aussi l'anonId `excluded` cote serveur (ceinture ET bretelles : le
 * flag local coupe l'envoi, le flag serveur filtre l'historique deja emis).
 */
export function isAnalyticsOptedOut(): boolean {
	try {
		return localStorage.getItem(OPTOUT_KEY) === "1";
	} catch {
		return false;
	}
}

export function markAnalyticsOptedOut(): void {
	try {
		localStorage.setItem(OPTOUT_KEY, "1");
	} catch {
		/* localStorage indisponible : tant pis, l'exclusion serveur suffit */
	}
}

/**
 * Funnel de monetisation (voir FunnelEvent cote backend). Fire-and-forget :
 * un echec de tracking ne doit JAMAIS perturber le parcours de paiement.
 */
@Injectable({ providedIn: "root" })
export class TrackingService {
	private readonly http = inject(HttpClient);

	funnel(kind: FunnelKind, step: ClientFunnelStep): void {
		if (isAnalyticsOptedOut()) return;
		this.http
			.post(`${BACKEND_URL}/track/funnel`, { anonId: getOrCreateAnonId(), kind, step })
			.subscribe({ error: () => {} });
	}
}
