import { AfterViewInit, ChangeDetectionStrategy, Component, input } from "@angular/core";

declare global {
	interface Window {
		adsbygoogle: unknown[];
	}
}

const AD_CLIENT = "ca-pub-2741267383918391";
const AD_SLOT = "2680980132";

/**
 * Emplacement publicitaire AdSense (unite display reutilisee partout, voir
 * AD_SLOT). Place UNIQUEMENT sur des ecrans d'attente/lecture (lobby, entre
 * les manches, ecran final, pages compte/login) - jamais pendant un mini-jeu
 * chronometre. `minHeight` reserve la place avant chargement pour eviter un
 * saut de mise en page (CLS) une fois la pub rendue.
 */
@Component({
	selector: "app-ad-slot",
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="ad-wrap" [style.min-height.px]="minHeight()">
			<span class="ad-label">Publicité</span>
			<ins
				class="adsbygoogle"
				style="display:block; width:100%;"
				[attr.data-ad-client]="AD_CLIENT"
				[attr.data-ad-slot]="AD_SLOT"
				data-ad-format="auto"
				data-full-width-responsive="true"
			></ins>
		</div>
	`,
	styles: `
		.ad-wrap {
			width: 100%;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 0.35rem;
			padding: 0.6rem;
			border-radius: var(--radius-md);
			background: var(--bg-base);
			border: 1px solid var(--border-subtle);
		}
		.ad-label {
			font-size: 0.65rem;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--text-muted);
			align-self: flex-start;
		}
		ins.adsbygoogle {
			width: 100%;
		}
	`,
})
export class AdSlotComponent implements AfterViewInit {
	/** Reserve de la hauteur avant chargement pour eviter un saut de mise en page. */
	readonly minHeight = input<number>(100);

	protected readonly AD_CLIENT = AD_CLIENT;
	protected readonly AD_SLOT = AD_SLOT;

	ngAfterViewInit(): void {
		try {
			(window.adsbygoogle = window.adsbygoogle || []).push({});
		} catch {
			// AdSense pas encore charge/bloqueur de pub actif : ne doit jamais casser la page.
		}
	}
}
