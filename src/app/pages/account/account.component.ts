import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { PlayerAuthService } from "../../core/services/player-auth.service";
import { BillingService } from "../../core/services/billing.service";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { AdSlotComponent } from "../../shared/components/ad-slot/ad-slot.component";

@Component({
	selector: "app-account",
	standalone: true,
	imports: [RouterLink, IconComponent, AdSlotComponent],
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

	/** Date lisible en heure locale (l'ISO brut est en UTC, un slice naif peut afficher la veille selon le fuseau). */
	formatSupporterSince(iso: string): string {
		return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
	}
}
