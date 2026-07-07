import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { SupporterOfferService } from "../../../core/services/supporter-offer.service";
import { PlayerAuthService } from "../../../core/services/player-auth.service";
import { BillingService } from "../../../core/services/billing.service";
import { IconComponent } from "../icon/icon.component";

type Step = "offer" | "auth";
type AuthMode = "login" | "register";

/**
 * Popup marketing "Rift Party Supporter" : prix + avantages + CTA. Declenchee
 * depuis n'importe quelle page via SupporterOfferService.open() (voir
 * app.component.html, monte une seule fois globalement). Gere l'auth EN
 * LIGNE (pas de detour par /login) : si pas connecte, le clic sur le CTA
 * revele un mini-formulaire dans la meme popup, puis enchaine direct sur le
 * checkout Stripe des l'auth reussie - pas de rupture de flow.
 */
@Component({
	selector: "app-supporter-offer-modal",
	standalone: true,
	imports: [FormsModule, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./supporter-offer-modal.component.html",
	styleUrl: "./supporter-offer-modal.component.scss",
})
export class SupporterOfferModalComponent {
	protected readonly offer = inject(SupporterOfferService);
	protected readonly playerAuth = inject(PlayerAuthService);
	private readonly billing = inject(BillingService);

	protected readonly step = signal<Step>("offer");
	protected readonly authMode = signal<AuthMode>("register");
	protected emailValue = "";
	protected passwordValue = "";
	protected readonly loading = signal(false);
	protected readonly error = signal<string | null>(null);

	protected readonly benefits = [
		{ icon: "crown" as const, text: "Badge Supporter sur ton compte" },
		{ icon: "sparkle" as const, text: "Accès prioritaire aux futurs avantages (rooms XXL, cosmétiques...)" },
		{ icon: "handshake" as const, text: "Tu soutiens direct le développement du jeu" },
	];

	close(): void {
		this.offer.close();
		this.step.set("offer");
		this.error.set(null);
	}

	onCtaClick(): void {
		if (this.playerAuth.isAuthenticated()) {
			void this.goToCheckout();
		} else {
			this.step.set("auth");
		}
	}

	async submitAuth(): Promise<void> {
		if (!this.emailValue.trim() || this.passwordValue.length < (this.authMode() === "register" ? 8 : 1)) return;
		this.loading.set(true);
		this.error.set(null);
		try {
			if (this.authMode() === "register") {
				await this.playerAuth.register(this.emailValue.trim(), this.passwordValue);
			} else {
				await this.playerAuth.login(this.emailValue.trim(), this.passwordValue);
			}
			await this.goToCheckout();
		} catch (err) {
			this.error.set(this.extractMessage(err));
			this.loading.set(false);
		}
	}

	private async goToCheckout(): Promise<void> {
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.billing.startCheckout();
		} catch {
			this.error.set("Impossible de lancer le paiement pour le moment.");
			this.loading.set(false);
		}
	}

	private extractMessage(err: unknown): string {
		const httpError = err as { error?: { message?: string } };
		return httpError?.error?.message ?? "Une erreur est survenue, reessaie.";
	}
}
