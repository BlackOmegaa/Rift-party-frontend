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
import { IconComponent, IconName } from "../../shared/components/icon/icon.component";
import { SupporterBadgeComponent } from "../../shared/components/supporter-badge/supporter-badge.component";
import { AdSlotComponent } from "../../shared/components/ad-slot/ad-slot.component";

type Mode = "create" | "join";

interface GameCard {
	icon: IconName;
	name: string;
	desc: string;
}

/** Vitrine des mini-jeux sur la home : contenu indexable (SEO) + découverte pour les nouveaux joueurs. */
const GAMES: GameCard[] = [
	{ icon: "question", name: "Guess the Champion", desc: "Devine le champion à partir d'indices révélés un à un." },
	{ icon: "letters", name: "Loldle", desc: "Le jeu de déduction LoL culte, en version multijoueur." },
	{ icon: "sword", name: "Draft Battle", desc: "Compose la meilleure draft et affronte celles de tes amis." },
	{ icon: "flask", name: "Fusion Champions", desc: "Deux champions fusionnés, à toi de les démasquer." },
	{ icon: "mask", name: "Undercover Champion", desc: "Un imposteur se cache parmi vous. Trouvez-le." },
	{ icon: "brush", name: "Croquis", desc: "Dessine, fais deviner, et ris des chefs-d'œuvre des autres." },
	{ icon: "search", name: "Qui suis-je ?", desc: "Pose les bonnes questions pour découvrir ton identité." },
	{ icon: "eye", name: "L'Intrus", desc: "Repère l'élément qui ne colle pas avec les autres." },
	{ icon: "scale", name: "Vote Party", desc: "Des questions qui départagent (ou fâchent) le groupe." },
	{ icon: "skull", name: "Last Survivor", desc: "Survis plus longtemps que tous les autres joueurs." },
	{ icon: "tower", name: "Turret Tank", desc: "Encaisse les tirs de tourelle le plus longtemps possible." },
	{ icon: "fog", name: "Brume", desc: "Avance dans le brouillard sans te faire surprendre." },
	{ icon: "list", name: "TikTok Ranking", desc: "Classez ensemble, comparez vos tops, débattez." },
];

@Component({
	selector: "app-home",
	standalone: true,
	imports: [FormsModule, SupportBannerComponent, RouterLink, IconComponent, SupporterBadgeComponent, AdSlotComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.scss",
})
export class HomeComponent {
	protected readonly games = GAMES;
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
