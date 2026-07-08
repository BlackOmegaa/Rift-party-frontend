import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { PlayerAuthService } from "../../core/services/player-auth.service";

/**
 * Page cible du lien envoye par email (/reset-password?token=...) : choisir
 * un nouveau mot de passe. En cas de succes le backend renvoie un JWT, donc
 * l'utilisateur est directement connecte et redirige vers son compte.
 */
@Component({
	selector: "app-reset-password",
	standalone: true,
	imports: [FormsModule, RouterLink],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./reset-password.component.html",
	styleUrl: "./reset-password.component.scss",
})
export class ResetPasswordComponent {
	private readonly playerAuth = inject(PlayerAuthService);
	private readonly router = inject(Router);

	private readonly token: string = inject(ActivatedRoute).snapshot.queryParamMap.get("token") ?? "";

	password = "";
	passwordConfirm = "";
	loading = signal(false);
	error = signal<string | null>(null);

	/** Lien ouvert sans token (URL tronquee par le client mail par ex.) : formulaire inutile. */
	hasToken(): boolean {
		return this.token.length > 0;
	}

	canSubmit(): boolean {
		return this.password.length >= 8 && this.passwordConfirm.length > 0 && !this.loading();
	}

	async submit(): Promise<void> {
		if (!this.canSubmit()) return;
		if (this.password !== this.passwordConfirm) {
			this.error.set("Les deux mots de passe ne correspondent pas.");
			return;
		}
		this.loading.set(true);
		this.error.set(null);
		try {
			await this.playerAuth.resetPassword(this.token, this.password);
			this.router.navigate(["/account"]);
		} catch (err) {
			const httpError = err as { error?: { message?: string } };
			this.error.set(httpError?.error?.message ?? "Une erreur est survenue, reessaie.");
		} finally {
			this.loading.set(false);
		}
	}
}
