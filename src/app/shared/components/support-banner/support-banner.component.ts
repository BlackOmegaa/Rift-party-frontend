import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { IconComponent } from "../icon/icon.component";

/** Lien Ko-fi unique pour tout le site : changer ici suffit, jamais hardcode ailleurs. */
export const KOFI_URL = "https://ko-fi.com/benson10451";

/**
 * Bloc "Soutenir le projet" discret, reutilisable partout (sidebar de room,
 * home...). En attendant un vrai reseau pub (AdSense demanderait une politique
 * de confidentialite + bandeau cookies RGPD, pas rentable avant du trafic),
 * ces emplacements pointent vers Ko-fi plutot que de rester vides.
 * `variant="compact"` : version resserree pour la sidebar de room.
 */
@Component({
	selector: "app-support-banner",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<a class="support-banner card" [class.compact]="variant() === 'compact'" [href]="kofiUrl" target="_blank" rel="noopener noreferrer">
			<app-icon name="support" [size]="variant() === 'compact' ? 16 : 20" />
			<span class="text">
				<strong>Soutenir Rift Party</strong>
				@if (variant() !== 'compact') {
					<small>Un café offert = un jeu de plus.</small>
				}
			</span>
		</a>
	`,
	styles: `
		.support-banner {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			padding: 0.7rem 0.85rem;
			text-decoration: none;
			color: var(--gold-bright);
			border-color: rgba(200, 170, 110, 0.28);
			transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
		}
		.support-banner:hover {
			transform: translateY(-1px);
			border-color: var(--gold);
			box-shadow: 0 0 18px rgba(200, 170, 110, 0.18);
		}
		.support-banner app-icon { flex-shrink: 0; color: var(--gold); }
		.text { display: flex; flex-direction: column; gap: 0.1rem; line-height: 1.25; }
		.text strong { font-size: 0.82rem; }
		.text small { color: var(--text-secondary); font-size: 0.7rem; }
		.support-banner.compact { padding: 0.55rem 0.7rem; }
		.support-banner.compact .text strong { font-size: 0.75rem; }
	`,
})
export class SupportBannerComponent {
	readonly variant = input<"default" | "compact">("default");
	protected readonly kofiUrl = KOFI_URL;
}
