import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AdminAuthService } from "../../core/services/admin-auth.service";
import {
	AdminMetrics,
	AdminMetricsService,
	BugReport,
	PeriodPreset,
	periodRangeFor,
} from "../../core/services/admin-metrics.service";
import { GamesService } from "../../core/services/games.service";
import { getOrCreateAnonId } from "../../core/services/anon-id";
import { markAnalyticsOptedOut } from "../../core/services/tracking.service";
import { BarListComponent, BarListItem } from "../../shared/components/charts/bar-list.component";
import { TrendAreaComponent, TrendPoint } from "../../shared/components/charts/trend-area.component";

const PRESET_LABELS: Record<PeriodPreset, string> = {
	today: "Aujourd'hui",
	yesterday: "Hier",
	"7d": "7 derniers jours",
	"30d": "30 derniers jours",
	custom: "Personnalise",
};

/** Onglets du dashboard : une categorie = un ecran, plus de scroll infini. */
export type DashboardTab = "overview" | "monetization" | "acquisition" | "engagement" | "reports";
const TABS: { id: DashboardTab; label: string }[] = [
	{ id: "overview", label: "Vue d'ensemble" },
	{ id: "monetization", label: "Monétisation" },
	{ id: "acquisition", label: "Acquisition" },
	{ id: "engagement", label: "Engagement" },
	{ id: "reports", label: "Signalements" },
];

@Component({
	selector: "app-admin-dashboard",
	standalone: true,
	imports: [FormsModule, BarListComponent, TrendAreaComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./admin-dashboard.component.html",
	styleUrl: "./admin-dashboard.component.scss",
})
export class AdminDashboardComponent implements OnInit {
	private readonly adminMetrics = inject(AdminMetricsService);
	private readonly adminAuth = inject(AdminAuthService);
	private readonly gamesService = inject(GamesService);
	private readonly router = inject(Router);

	protected readonly presets: PeriodPreset[] = ["today", "yesterday", "7d", "30d", "custom"];
	protected readonly presetLabel = (p: PeriodPreset) => PRESET_LABELS[p];
	protected readonly preset = signal<PeriodPreset>("7d");
	protected readonly customFrom = signal(this.isoDateInput(new Date(Date.now() - 30 * 86_400_000)));
	protected readonly customTo = signal(this.isoDateInput(new Date()));

	protected readonly metrics = signal<AdminMetrics | null>(null);
	protected readonly loading = signal(true);
	protected readonly error = signal<string | null>(null);
	private readonly gameLabels = signal<Record<string, string>>({});

	protected readonly tabs = TABS;
	protected readonly activeTab = signal<DashboardTab>("overview");

	protected readonly bugReports = signal<BugReport[]>([]);
	protected readonly bugOpenCount = signal(0);
	protected readonly bugLoading = signal(false);

	protected readonly roomSizeItems = computed<BarListItem[]>(() =>
		(this.metrics()?.engagement.roomSizeDistribution ?? []).map((r) => ({
			label: `${r.bucket} joueurs`,
			value: r.count,
		})),
	);

	protected readonly sourceItems = computed<BarListItem[]>(() =>
		(this.metrics()?.acquisition.bySource ?? []).map((s) => ({
			label: this.sourceLabel(s.source),
			value: s.count,
			displayValue: this.pct(s.pct),
		})),
	);

	protected readonly modeItems = computed<BarListItem[]>(() => {
		const ranking = this.metrics()?.modes.ranking ?? [];
		const labels = this.gameLabels();
		return ranking.map((m, i) => ({
			label: labels[m.gameId] ?? m.gameId,
			value: m.launches,
			displayValue: `${m.launches} · ${this.pct(m.usagePct)}`,
			highlight: i === 0,
		}));
	});

	protected readonly trendPoints = computed<TrendPoint[]>(() =>
		(this.metrics()?.acquisition.dailySeries ?? []).map((d) => ({
			date: this.shortDate(d.date),
			newValue: d.newVisitors,
			returningValue: d.returningVisitors,
		})),
	);

	/** Marches du funnel abonnement, avec largeur de barre (relative au max) et taux de passage depuis la marche precedente. */
	protected readonly subFunnelSteps = computed(() => {
		const s = this.metrics()?.monetization.subscription;
		if (!s) return [];
		const steps = [
			{ label: "Offre affichée", value: s.offerViewed },
			{ label: "Clic « Devenir Supporter »", value: s.ctaClicked },
			{ label: "Arrivé sur Stripe", value: s.checkoutStarted },
			{ label: "Paiement confirmé", value: s.completed },
		];
		const max = Math.max(...steps.map((x) => x.value), 1);
		return steps.map((step, i) => ({
			...step,
			width: (step.value / max) * 100,
			rate: i === 0 ? null : steps[i - 1].value ? step.value / steps[i - 1].value : null,
		}));
	});

	ngOnInit(): void {
		this.ensureDeviceExcluded();
		this.gamesService.list().subscribe((games) => {
			this.gameLabels.set(Object.fromEntries(games.map((g) => [g.id, g.label])));
		});
		this.load();
		this.loadBugReports();
	}

	selectTab(tab: DashboardTab): void {
		this.activeTab.set(tab);
		if (tab === "reports") this.loadBugReports();
	}

	loadBugReports(): void {
		this.bugLoading.set(true);
		this.adminMetrics.getBugReports().subscribe({
			next: (res) => {
				this.bugReports.set(res.reports);
				this.bugOpenCount.set(res.openCount);
				this.bugLoading.set(false);
			},
			error: () => this.bugLoading.set(false),
		});
	}

	toggleBugReport(report: BugReport): void {
		const next = report.status === "OPEN" ? "DONE" : "OPEN";
		this.adminMetrics.setBugReportStatus(report.id, next).subscribe({
			next: (updated) => {
				this.bugReports.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
				this.bugOpenCount.update((n) => (next === "DONE" ? Math.max(0, n - 1) : n + 1));
			},
		});
	}

	/**
	 * Ouvrir le dashboard = appareil de l'equipe : marque l'anonId `excluded`
	 * cote serveur (filtre tout l'historique deja emis par cet appareil) et
	 * pose le flag local (coupe le tracking futur). Appele a CHAQUE ouverture
	 * (upsert idempotent, pas seulement quand le flag local manque) : un reset
	 * des stats supprime les lignes Visitor, il faut pouvoir se re-marquer.
	 * Pour exclure le telephone, il suffit d'ouvrir le dashboard dessus une fois.
	 */
	private ensureDeviceExcluded(): void {
		this.adminMetrics.excludeMe(getOrCreateAnonId()).subscribe({
			next: () => markAnalyticsOptedOut(),
			error: () => {},
		});
	}

	load(): void {
		this.loading.set(true);
		this.error.set(null);
		const range = periodRangeFor(this.preset(), { from: this.customFrom(), to: this.customTo() });
		this.adminMetrics.getMetrics(range).subscribe({
			next: (res) => {
				this.metrics.set(res);
				this.loading.set(false);
			},
			error: (err) => {
				this.loading.set(false);
				if (err.status === 401) {
					this.adminAuth.logout();
					this.router.navigate(["/rp-console"]);
					return;
				}
				this.error.set("Impossible de charger les metriques.");
			},
		});
	}

	selectPreset(p: PeriodPreset): void {
		this.preset.set(p);
		if (p !== "custom") this.load();
	}

	applyCustomRange(): void {
		this.load();
	}

	// ---------------------------------------------------------------------
	// Formatage
	// ---------------------------------------------------------------------

	pct(value: number | null): string {
		if (value === null) return "—";
		return `${Math.round(value * 100)}%`;
	}

	/** Montant Stripe (centimes) -> "12,34 €". */
	euros(cents: number): string {
		return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
	}

	/** Date+heure lisible pour les signalements. */
	localDateTime(iso: string): string {
		return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
	}

	/** Nom du mois en cours ("juillet"), pour la carte revenus. */
	currentMonthLabel(): string {
		return new Date().toLocaleDateString("fr-FR", { month: "long" });
	}

	duration(seconds: number | null): string {
		if (seconds === null) return "—";
		if (seconds < 60) return `${Math.round(seconds)}s`;
		const m = Math.round(seconds / 60);
		return m < 60 ? `${m} min` : `${(m / 60).toFixed(1)} h`;
	}

	round(value: number | null, decimals = 1): string {
		if (value === null) return "—";
		return value.toFixed(decimals);
	}

	/** +N / -N / stable, pour les cartes "aujourd'hui vs hier". */
	delta(today: number, yesterday: number): { text: string; direction: "up" | "down" | "flat" } {
		const diff = today - yesterday;
		if (diff === 0) return { text: "stable", direction: "flat" };
		const pctChange = yesterday ? Math.round((diff / yesterday) * 100) : null;
		const sign = diff > 0 ? "+" : "";
		const text = pctChange !== null ? `${sign}${diff} (${sign}${pctChange}%)` : `${sign}${diff}`;
		return { text, direction: diff > 0 ? "up" : "down" };
	}

	modeLabel(gameId: string): string {
		return this.gameLabels()[gameId] ?? gameId;
	}

	sourceLabel(source: string): string {
		const labels: Record<string, string> = {
			reddit: "Reddit",
			discord: "Discord",
			tiktok: "TikTok",
			twitter: "Twitter/X",
			instagram: "Instagram",
			youtube: "YouTube",
			google: "Google",
			direct: "Acces direct",
			invitation: "Invitation room",
			autre: "Autre",
			inconnu: "Inconnu",
		};
		return labels[source] ?? source;
	}

	/** Date lisible en heure locale (l'ISO brut est en UTC : un `.slice(0,10)` naïf peut afficher la veille selon le fuseau). */
	localDate(iso: string): string {
		return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" });
	}

	private shortDate(iso: string): string {
		const [, m, d] = iso.split("-");
		return `${d}/${m}`;
	}

	private isoDateInput(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	logout(): void {
		this.adminAuth.logout();
		this.router.navigate(["/rp-console"]);
	}
}
