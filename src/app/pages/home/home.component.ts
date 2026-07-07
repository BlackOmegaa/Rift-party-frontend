import {
	ChangeDetectionStrategy,
	Component,
	effect,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { RoomService } from "../../core/services/room.service";
import { SupportBannerComponent } from "../../shared/components/support-banner/support-banner.component";
import { PlayerAuthService } from "../../core/services/player-auth.service";
import { IconComponent } from "../../shared/components/icon/icon.component";

type Mode = "create" | "join";

@Component({
	selector: "app-home",
	standalone: true,
	imports: [FormsModule, SupportBannerComponent, RouterLink, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.scss",
})
export class HomeComponent {
	mode = signal<Mode>("create");
	pseudo = "";
	code = "";
	/** Code exact pre-rempli depuis un lien ?join=CODE, pour detecter si le joueur l'a modifie a la main avant de soumettre (auquel cas ce n'est plus une arrivee par invitation). Voir RoomService.joinRoom. */
	private readonly prefilledInviteCode: string | null = null;

	constructor(
		protected readonly roomService: RoomService,
		protected readonly playerAuth: PlayerAuthService,
		private readonly router: Router,
		route: ActivatedRoute,
	) {
		effect(() => {
			const room = this.roomService.room();
			if (room) this.router.navigate(["/room", room.code]);
		});

		// Lien d'invitation (?join=CODE, voir copyInviteLink dans RoomComponent) :
		// bascule sur l'onglet Rejoindre avec le code pre-rempli, reste juste le pseudo.
		const joinCode = route.snapshot.queryParamMap.get("join");
		if (joinCode) {
			this.mode.set("join");
			this.code = joinCode.toUpperCase();
			this.prefilledInviteCode = this.code;
		}
	}

	canSubmit(): boolean {
		if (!this.pseudo.trim()) return false;
		if (this.mode() === "join" && !this.code.trim()) return false;
		return true;
	}

	submit(): void {
		if (this.mode() === "create") {
			this.roomService.createRoom(this.pseudo.trim());
		} else {
			const viaInvite = !!this.prefilledInviteCode && this.code.trim().toUpperCase() === this.prefilledInviteCode;
			this.roomService.joinRoom(this.code.trim(), this.pseudo.trim(), viaInvite);
		}
	}
}
