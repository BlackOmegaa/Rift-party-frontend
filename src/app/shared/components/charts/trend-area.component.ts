import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface TrendPoint {
	date: string;
	newValue: number;
	returningValue: number;
}

/**
 * Aire empilee (nouveaux vs recurrents) en SVG pur, sans lib de graphes : le
 * volume de donnees (quelques dizaines de points max, un dashboard admin) ne
 * justifie pas une dependance. Axe X = dates (labels espaces pour rester
 * lisibles), axe Y implicite (pas de graduation, juste la forme de la tendance).
 */
@Component({
	selector: 'app-trend-area',
	standalone: true,
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		@if (points().length) {
			<svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" class="trend-svg">
				<path [attr.d]="returningPath()" class="area returning" />
				<path [attr.d]="newPath()" class="area new" />
			</svg>
			<div class="trend-legend">
				<span class="dot new"></span> Nouveaux
				<span class="dot returning"></span> Recurrents
			</div>
			<div class="trend-axis">
				<span>{{ points()[0].date }}</span>
				<span>{{ points()[points().length - 1].date }}</span>
			</div>
		} @else {
			<p class="trend-empty">Pas encore de donnees sur cette periode.</p>
		}
	`,
	styles: `
		:host { display: block; }
		.trend-svg { width: 100%; height: 140px; display: block; overflow: visible; }
		.area.new { fill: color-mix(in srgb, var(--gold, #c8aa6e), transparent 35%); }
		.area.returning { fill: color-mix(in srgb, var(--teal, #0ac8b9), transparent 65%); }
		.trend-legend {
			display: flex;
			align-items: center;
			gap: 0.4rem;
			margin-top: 0.6rem;
			font-size: 0.72rem;
			color: var(--text-muted);
			font-weight: 800;
			text-transform: uppercase;
			letter-spacing: 0.04em;
		}
		.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-left: 0.6rem; }
		.dot:first-child { margin-left: 0; }
		.dot.new { background: var(--gold, #c8aa6e); }
		.dot.returning { background: var(--teal, #0ac8b9); }
		.trend-axis {
			display: flex;
			justify-content: space-between;
			margin-top: 0.3rem;
			font-size: 0.7rem;
			color: var(--text-muted);
		}
		.trend-empty { color: var(--text-muted); font-size: 0.85rem; }
	`,
})
export class TrendAreaComponent {
	points = input.required<TrendPoint[]>();

	protected readonly width = 600;
	protected readonly height = 140;

	private readonly maxTotal = computed(() =>
		Math.max(1, ...this.points().map((p) => p.newValue + p.returningValue)),
	);

	private xOf(index: number): number {
		const n = this.points().length;
		return n <= 1 ? 0 : (index / (n - 1)) * this.width;
	}

	private yOf(value: number): number {
		return this.height - (value / this.maxTotal()) * (this.height - 8);
	}

	/** Aire du total (nouveaux + recurrents), en arriere-plan. */
	returningPath(): string {
		const pts = this.points();
		if (!pts.length) return '';
		const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${this.xOf(i)} ${this.yOf(p.newValue + p.returningValue)}`);
		return `${top.join(' ')} L ${this.xOf(pts.length - 1)} ${this.height} L 0 ${this.height} Z`;
	}

	/** Aire des seuls nouveaux visiteurs, en superposition. */
	newPath(): string {
		const pts = this.points();
		if (!pts.length) return '';
		const top = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${this.xOf(i)} ${this.yOf(p.newValue)}`);
		return `${top.join(' ')} L ${this.xOf(pts.length - 1)} ${this.height} L 0 ${this.height} Z`;
	}
}
