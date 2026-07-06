import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { AdminAuthService } from "../../core/services/admin-auth.service";

@Component({
	selector: "app-admin-login",
	standalone: true,
	imports: [FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./admin-login.component.html",
	styleUrl: "./admin-login.component.scss",
})
export class AdminLoginComponent {
	email = "";
	password = "";
	loading = signal(false);
	error = signal<string | null>(null);

	constructor(
		private readonly adminAuth: AdminAuthService,
		private readonly router: Router,
	) {}

	canSubmit(): boolean {
		return !!this.email.trim() && !!this.password.trim() && !this.loading();
	}

	async submit(): Promise<void> {
		if (!this.canSubmit()) return;
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.adminAuth.login(this.email.trim(), this.password);
			this.router.navigate(["/rp-console/dashboard"]);
		} catch {
			this.error.set("Email ou mot de passe incorrect.");
		} finally {
			this.loading.set(false);
		}
	}
}
