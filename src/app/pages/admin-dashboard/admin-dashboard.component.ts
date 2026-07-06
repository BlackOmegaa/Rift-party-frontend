import { ChangeDetectionStrategy, Component, OnInit, signal } from "@angular/core";
import { Router } from "@angular/router";
import { AdminAuthService } from "../../core/services/admin-auth.service";
import { AdminMetrics, AdminMetricsService } from "../../core/services/admin-metrics.service";

@Component({
	selector: "app-admin-dashboard",
	standalone: true,
	imports: [],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./admin-dashboard.component.html",
	styleUrl: "./admin-dashboard.component.scss",
})
export class AdminDashboardComponent implements OnInit {
	metrics = signal<AdminMetrics | null>(null);
	loading = signal(true);
	error = signal<string | null>(null);

	constructor(
		private readonly adminMetrics: AdminMetricsService,
		private readonly adminAuth: AdminAuthService,
		private readonly router: Router,
	) {}

	ngOnInit(): void {
		this.load();
	}

	load(): void {
		this.loading.set(true);
		this.error.set(null);
		this.adminMetrics.getMetrics().subscribe({
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

	pct(value: number | null): string {
		if (value === null) return "—";
		return `${Math.round(value * 100)}%`;
	}

	duration(seconds: number | null): string {
		if (seconds === null) return "—";
		const m = Math.round(seconds / 60);
		return m < 60 ? `${m} min` : `${Math.round(m / 60)} h`;
	}

	logout(): void {
		this.adminAuth.logout();
		this.router.navigate(["/rp-console"]);
	}
}
