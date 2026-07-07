import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface BarListItem {
	label: string;
	value: number;
	/** Texte affiche a droite (ex: "42%", "3m 20s") ; par defaut la valeur brute. */
	displayValue?: string;
	/** Met la barre en évidence (ex: le mode le plus joue). */
	highlight?: boolean;
}

/**
 * Liste de barres horizontales, proportionnelles au max du jeu de donnees.
 * Sert au classement des modes, a la repartition des tailles de room et a la
 * repartition des sources d'acquisition : un seul composant, trois usages.
 */
@Component({
	selector: 'app-bar-list',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<div class="bar-list">
			@for (item of items(); track item.label) {
				<div class="bar-row" [class.highlight]="item.highlight">
					<span class="bar-label">{{ item.label }}</span>
					<div class="bar-track">
						<div class="bar-fill" [style.width.%]="pctOf(item.value)"></div>
					</div>
					<span class="bar-value">{{ item.displayValue ?? item.value }}</span>
				</div>
			} @empty {
				<p class="bar-empty">Pas encore de donnees.</p>
			}
		</div>
	`,
	styles: `
		.bar-list { display: flex; flex-direction: column; gap: 0.55rem; }
		.bar-row {
			display: grid;
			grid-template-columns: minmax(90px, 34%) 1fr auto;
			align-items: center;
			gap: 0.7rem;
		}
		.bar-label {
			font-size: 0.82rem;
			font-weight: 800;
			color: var(--text-secondary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.bar-row.highlight .bar-label { color: var(--gold-bright); }
		.bar-track {
			position: relative;
			height: 9px;
			border-radius: 999px;
			background: rgba(255, 255, 255, 0.06);
			overflow: hidden;
		}
		.bar-fill {
			height: 100%;
			border-radius: 999px;
			background: linear-gradient(90deg, var(--teal, #0ac8b9), var(--gold, #c8aa6e));
			transition: width 0.5s cubic-bezier(0.16, 0.8, 0.3, 1);
		}
		.bar-row.highlight .bar-fill {
			background: linear-gradient(90deg, var(--gold-dim), var(--gold));
			box-shadow: 0 0 12px rgba(200, 170, 110, 0.35);
		}
		.bar-value {
			font-size: 0.82rem;
			font-weight: 900;
			color: var(--gold-bright);
			min-width: 3.2rem;
			text-align: right;
		}
		.bar-empty { color: var(--text-muted); font-size: 0.85rem; }
	`,
})
export class BarListComponent {
	items = input.required<BarListItem[]>();

	private readonly max = computed(() => Math.max(1, ...this.items().map((i) => i.value)));

	pctOf(value: number): number {
		return Math.max(2, (value / this.max()) * 100);
	}
}
