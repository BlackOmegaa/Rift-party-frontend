import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PlayerAuthService } from "../../../core/services/player-auth.service";
import { IconComponent } from "../icon/icon.component";

/**
 * Badge permanent "Rift Party Supporter" visible sur TOUTES les pages tant
 * que le joueur est abonne (monte une fois globalement, voir app.component.html) -
 * avant ca, rien ne rappelait a l'utilisateur qu'il etait bien abonne en
 * dehors de la page /account elle-meme.
 */
@Component({
	selector: "app-supporter-badge",
	standalone: true,
	imports: [RouterLink, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (playerAuth.profile()?.isSubscriber) {
			<a class="badge" routerLink="/account" title="Rift Party Supporter">
				<app-icon name="crown" [size]="14" />
				<span>Supporter</span>
			</a>
		}
	`,
	styles: `
		.badge {
			position: fixed;
			top: 1rem;
			left: 1rem;
			z-index: 250;
			display: flex;
			align-items: center;
			gap: 0.35rem;
			padding: 0.4rem 0.75rem;
			border-radius: 999px;
			background: linear-gradient(135deg, rgba(200, 170, 110, 0.22), rgba(1, 10, 19, 0.85));
			border: 1px solid rgba(200, 170, 110, 0.5);
			color: var(--gold-bright);
			font-weight: 800;
			font-size: 0.72rem;
			letter-spacing: 0.03em;
			text-decoration: none;
			backdrop-filter: blur(8px);
			box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
			transition: transform 0.16s ease, border-color 0.16s ease;
		}
		.badge:hover {
			transform: translateY(-1px);
			border-color: var(--gold);
		}
		.badge app-icon {
			color: var(--gold);
		}
	`,
})
export class SupporterBadgeComponent {
	protected readonly playerAuth = inject(PlayerAuthService);
}
