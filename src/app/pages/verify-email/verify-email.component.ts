import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { PlayerAuthService } from "../../core/services/player-auth.service";

/**
 * Page cible du lien de confirmation d'adresse (/verify-email?token=...).
 * Fonctionne connecte ou non : le token seul identifie le compte, donc le
 * lien marche aussi ouvert depuis un autre navigateur que celui du jeu.
 */
@Component({
	selector: "app-verify-email",
	standalone: true,
	imports: [RouterLink],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./verify-email.component.html",
	styleUrl: "./verify-email.component.scss",
})
export class VerifyEmailComponent implements OnInit {
	protected readonly playerAuth = inject(PlayerAuthService);
	private readonly token: string = inject(ActivatedRoute).snapshot.queryParamMap.get("token") ?? "";

	protected readonly state = signal<"verifying" | "success" | "error">("verifying");
	protected readonly errorMessage = signal<string>("");

	async ngOnInit(): Promise<void> {
		if (!this.token) {
			this.state.set("error");
			this.errorMessage.set("Ce lien est incomplet. Ouvre le lien recu par email.");
			return;
		}
		try {
			await this.playerAuth.verifyEmail(this.token);
			this.state.set("success");
		} catch (err) {
			const httpError = err as { error?: { message?: string } };
			this.state.set("error");
			this.errorMessage.set(httpError?.error?.message ?? "Une erreur est survenue, reessaie.");
		}
	}
}
