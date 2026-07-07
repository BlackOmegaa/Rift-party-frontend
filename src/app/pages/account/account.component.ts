import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PlayerAuthService } from "../../core/services/player-auth.service";
import { BillingService } from "../../core/services/billing.service";
import { IconComponent } from "../../shared/components/icon/icon.component";

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 8; // ~16s : le webhook Stripe arrive presque toujours en 1-3s, marge large.

@Component({
	selector: "app-account",
	standalone: true,
	imports: [RouterLink, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./account.component.html",
	styleUrl: "./account.component.scss",
})
export class AccountComponent {
	protected readonly playerAuth = inject(PlayerAuthService);
	private readonly billing = inject(BillingService);
	private readonly router = inject(Router);

	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);
	/** Retour de redirection Stripe (voir success_url/cancel_url dans billing.service.ts backend). */
	protected readonly checkoutStatus = signal<"success" | "cancelled" | null>(null);
	/** True pendant qu'on attend que le webhook Stripe confirme le paiement (evite un "Chargement..." infini). */
	protected readonly confirmingPayment = signal(false);
	/** True si on a fini de sonder sans jamais voir le statut passer actif (webhook en retard/echoue). */
	protected readonly confirmTimedOut = signal(false);

	constructor() {
		const status = inject(ActivatedRoute).snapshot.queryParamMap.get("checkout");
		if (status === "success" || status === "cancelled") {
			this.checkoutStatus.set(status);
			if (status === "success") void this.pollUntilSubscribed();
		}
	}

	/** Le webhook Stripe arrive de facon asynchrone apres la redirection : on sonde /me au lieu d'un seul refresh, avec une sortie propre plutot qu'un spinner qui tourne indefiniment. */
	private async pollUntilSubscribed(): Promise<void> {
		this.confirmingPayment.set(true);
		for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
			await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
			await this.playerAuth.refreshProfile();
			if (this.playerAuth.profile()?.isSubscriber) {
				this.confirmingPayment.set(false);
				return;
			}
		}
		this.confirmingPayment.set(false);
		this.confirmTimedOut.set(true);
	}

	protected retryConfirm(): void {
		this.confirmTimedOut.set(false);
		void this.pollUntilSubscribed();
	}

	async subscribe(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.billing.startCheckout();
		} catch {
			this.error.set("Impossible de lancer le paiement pour le moment.");
			this.loading.set(false);
		}
	}

	async manageBilling(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.billing.openPortal();
		} catch {
			this.error.set("Impossible d'ouvrir la gestion d'abonnement pour le moment.");
			this.loading.set(false);
		}
	}

	logout(): void {
		this.playerAuth.logout();
		this.router.navigate(["/"]);
	}
}
