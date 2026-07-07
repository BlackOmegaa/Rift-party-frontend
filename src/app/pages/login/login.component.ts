import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { PlayerAuthService } from "../../core/services/player-auth.service";
import { AdSlotComponent } from "../../shared/components/ad-slot/ad-slot.component";

type Mode = "login" | "register";

@Component({
	selector: "app-login",
	standalone: true,
	imports: [FormsModule, AdSlotComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./login.component.html",
	styleUrl: "./login.component.scss",
})
export class LoginComponent {
	mode = signal<Mode>("login");
	email = "";
	password = "";
	loading = signal(false);
	error = signal<string | null>(null);

	constructor(
		private readonly playerAuth: PlayerAuthService,
		private readonly router: Router,
	) {}

	canSubmit(): boolean {
		return !!this.email.trim() && this.password.length >= (this.mode() === "register" ? 8 : 1) && !this.loading();
	}

	async submit(): Promise<void> {
		if (!this.canSubmit()) return;
		this.loading.set(true);
		this.error.set(null);
		try {
			if (this.mode() === "register") {
				await this.playerAuth.register(this.email.trim(), this.password);
			} else {
				await this.playerAuth.login(this.email.trim(), this.password);
			}
			this.router.navigate(["/account"]);
		} catch (err) {
			this.error.set(this.extractMessage(err));
		} finally {
			this.loading.set(false);
		}
	}

	private extractMessage(err: unknown): string {
		const httpError = err as { error?: { message?: string } };
		return httpError?.error?.message ?? "Une erreur est survenue, reessaie.";
	}
}
