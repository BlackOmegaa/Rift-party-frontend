import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { PlayerAuthService } from "../../../core/services/player-auth.service";
import { TrackingService } from "../../../core/services/tracking.service";
import { IconComponent } from "../icon/icon.component";

type Status = "confirming" | "success" | "timeout" | "cancelled";

/**
 * Toast global (monte une fois dans AppComponent) qui gere le retour de
 * Stripe Checkout QUELLE QUE SOIT la page d'origine (room, account...) - voir
 * BillingService.startCheckout() qui renvoie sur le `returnPath` d'origine
 * plutot que de forcer /account. Evite qu'un joueur qui s'abonne en pleine
 * partie se retrouve ejecte de sa room par la redirection de paiement.
 */
@Component({
	selector: "app-checkout-confirmation",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (status(); as s) {
			<div class="toast" [class.warn]="s === 'timeout'" [class.cancelled]="s === 'cancelled'">
				@if (s === "confirming") {
					<span class="spinner"></span>
					<span>Confirmation du paiement...</span>
				} @else if (s === "success") {
					<app-icon name="crown" [size]="16" />
					<span>Abonnement actif, merci pour ton soutien !</span>
				} @else if (s === "timeout") {
					<span>Ça prend plus de temps que prévu, le paiement a peut-être quand même fonctionné.</span>
					<button (click)="retry()">Revérifier</button>
				} @else {
					<span>Paiement annulé.</span>
				}
				<button class="close" (click)="dismiss()">
					<app-icon name="close" [size]="12" />
				</button>
			</div>
		}
	`,
	styles: `
		.toast {
			position: fixed;
			top: 1rem;
			left: 50%;
			transform: translateX(-50%);
			z-index: 600;
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.7rem 1rem;
			border-radius: var(--radius-md);
			background: rgba(1, 10, 19, 0.92);
			backdrop-filter: blur(10px);
			border: 1px solid rgba(10, 200, 185, 0.4);
			color: var(--text-primary);
			font-size: 0.85rem;
			box-shadow: 0 12px 34px rgba(0, 0, 0, 0.45);
			max-width: 92vw;
		}
		.toast.warn { border-color: rgba(224, 169, 74, 0.4); }
		.toast.cancelled { border-color: var(--border-subtle); color: var(--text-secondary); }
		.toast app-icon { color: var(--gold); flex-shrink: 0; }
		.toast button {
			background: none;
			border: 1px solid var(--border-subtle);
			border-radius: var(--radius-sm);
			color: var(--text-secondary);
			font-size: 0.78rem;
			padding: 0.2rem 0.5rem;
			cursor: pointer;
			flex-shrink: 0;
		}
		.close {
			border: none !important;
			padding: 0.2rem !important;
			display: grid;
			place-items: center;
			color: var(--text-muted) !important;
		}
		.spinner {
			width: 14px;
			height: 14px;
			border-radius: 50%;
			border: 2px solid rgba(10, 200, 185, 0.25);
			border-top-color: var(--teal);
			animation: spin 0.8s linear infinite;
			flex-shrink: 0;
		}
		@keyframes spin {
			to { transform: rotate(360deg); }
		}
	`,
})
export class CheckoutConfirmationComponent {
	private readonly playerAuth = inject(PlayerAuthService);
	private readonly tracking = inject(TrackingService);

	protected readonly status = signal<Status | null>(null);

	constructor() {
		// window.location plutot que le Router : ce composant est monte au tout
		// debut du bootstrap (voir app.component.html), avant que la navigation
		// initiale du Router n'ait forcement fini de se resoudre.
		const checkout = new URLSearchParams(window.location.search).get("checkout");
		if (checkout === "success" || checkout === "cancelled") {
			this.stripQueryParam();
			this.status.set(checkout === "success" ? "confirming" : "cancelled");
			if (checkout === "success") {
				void this.confirm();
			} else {
				// Abandon sur la page Stripe : point de fuite precieux pour le funnel.
				this.tracking.funnel("SUBSCRIPTION", "CHECKOUT_CANCELLED");
				setTimeout(() => this.dismiss(), 4000);
			}
		}
	}

	protected async retry(): Promise<void> {
		this.status.set("confirming");
		await this.confirm();
	}

	protected dismiss(): void {
		this.status.set(null);
	}

	private async confirm(): Promise<void> {
		const success = await this.playerAuth.pollUntilSubscribed();
		this.status.set(success ? "success" : "timeout");
		if (success) setTimeout(() => this.dismiss(), 4000);
	}

	/** Retire ?checkout=... de l'URL sans recharger (history API directe, evite tout souci de timing avec le Router), pour qu'un refresh ne relance pas la confirmation. */
	private stripQueryParam(): void {
		const url = new URL(window.location.href);
		url.searchParams.delete("checkout");
		window.history.replaceState(null, "", url.toString());
	}
}
