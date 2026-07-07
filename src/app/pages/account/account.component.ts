import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { PlayerAuthService } from "../../core/services/player-auth.service";
import { BillingService } from "../../core/services/billing.service";

@Component({
	selector: "app-account",
	standalone: true,
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

	constructor() {
		const status = inject(ActivatedRoute).snapshot.queryParamMap.get("checkout");
		if (status === "success" || status === "cancelled") {
			this.checkoutStatus.set(status);
			// Le webhook Stripe peut arriver quelques secondes apres la redirection :
			// un petit delai avant de rafraichir laisse le temps au statut de se mettre a jour.
			if (status === "success") setTimeout(() => this.playerAuth.refreshProfile(), 2000);
		}
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
