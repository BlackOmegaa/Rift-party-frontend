import { ChangeDetectionStrategy, Component, inject } from "@angular/core";
import { RouterLink } from "@angular/router";
import { PlayerAuthService } from "../../../core/services/player-auth.service";
import { IconComponent } from "../icon/icon.component";

/**
 * Badge "Rift Party Supporter" affiche aux abonnes. Monte dans le flux de la
 * home (sous le titre, voir home.component.html) et non plus en `position:
 * fixed` global : l'ancien badge flottant pouvait recouvrir des elements de
 * jeu. Les animations (apparition, halo pulse, reflet) compensent en le
 * rendant immanquable au chargement de la page.
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
		:host {
			display: inline-flex;
			margin-top: 0.9rem;
		}
		.badge {
			position: relative;
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			padding: 0.45rem 0.95rem;
			border-radius: 999px;
			overflow: hidden;
			background: linear-gradient(135deg, rgba(200, 170, 110, 0.24), rgba(1, 10, 19, 0.85));
			border: 1px solid rgba(200, 170, 110, 0.55);
			color: var(--gold-bright);
			font-weight: 800;
			font-size: 0.74rem;
			letter-spacing: 0.05em;
			text-transform: uppercase;
			text-decoration: none;
			animation:
				badge-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both 0.25s,
				badge-glow 2.6s ease-in-out infinite 0.8s;
			transition: transform 0.16s ease, border-color 0.16s ease;
		}
		/* Reflet qui balaie le badge en boucle */
		.badge::after {
			content: "";
			position: absolute;
			inset: 0;
			background: linear-gradient(
				115deg,
				transparent 30%,
				rgba(240, 230, 210, 0.35) 50%,
				transparent 70%
			);
			transform: translateX(-130%);
			animation: badge-shine 3.2s ease-in-out infinite 1.2s;
		}
		.badge:hover {
			transform: translateY(-2px) scale(1.04);
			border-color: var(--gold);
		}
		.badge app-icon {
			color: var(--gold);
			animation: crown-wiggle 3.2s ease-in-out infinite 1.2s;
		}
		@keyframes badge-pop {
			from {
				opacity: 0;
				transform: scale(0.5) translateY(6px);
			}
			to {
				opacity: 1;
				transform: scale(1) translateY(0);
			}
		}
		@keyframes badge-glow {
			0%,
			100% {
				box-shadow: 0 0 10px rgba(200, 170, 110, 0.18);
			}
			50% {
				box-shadow: 0 0 22px rgba(200, 170, 110, 0.45);
			}
		}
		@keyframes badge-shine {
			0%,
			55% {
				transform: translateX(-130%);
			}
			85%,
			100% {
				transform: translateX(130%);
			}
		}
		@keyframes crown-wiggle {
			0%,
			70%,
			100% {
				transform: rotate(0);
			}
			78% {
				transform: rotate(-12deg);
			}
			86% {
				transform: rotate(10deg);
			}
			93% {
				transform: rotate(-5deg);
			}
		}
	`,
})
export class SupporterBadgeComponent {
	protected readonly playerAuth = inject(PlayerAuthService);
}
