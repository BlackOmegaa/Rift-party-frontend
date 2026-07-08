import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { PlayerAuthService } from "../../core/services/player-auth.service";
import { AdSlotComponent } from "../../shared/components/ad-slot/ad-slot.component";

type Mode = "login" | "register" | "forgot";

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
	/** Email de reset envoye : on fige le formulaire "forgot" sur un message de confirmation. */
	resetSent = signal(false);

	constructor(
		protected readonly playerAuth: PlayerAuthService,
		private readonly router: Router,
	) {}

	setMode(mode: Mode): void {
		this.mode.set(mode);
		this.error.set(null);
		this.resetSent.set(false);
	}

	canSubmit(): boolean {
		if (this.loading()) return false;
		if (!this.email.trim()) return false;
		if (this.mode() === "forgot") return true;
		return this.password.length >= (this.mode() === "register" ? 8 : 1);
	}

	async submit(): Promise<void> {
		if (!this.canSubmit()) return;
		this.loading.set(true);
		this.error.set(null);
		try {
			if (this.mode() === "forgot") {
				await this.playerAuth.requestPasswordReset(this.email.trim());
				this.resetSent.set(true);
			} else if (this.mode() === "register") {
				await this.playerAuth.register(this.email.trim(), this.password);
				this.router.navigate(["/account"]);
			} else {
				await this.playerAuth.login(this.email.trim(), this.password);
				this.router.navigate(["/account"]);
			}
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
