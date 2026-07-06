import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	effect,
	ElementRef,
	inject,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { WhoamiService } from "../../core/services/whoami.service";
import { ChampionSelectComponent } from "../../shared/components/champion-select/champion-select.component";
import { CHAMPION_OPTIONS, championSquareUrl } from "../../shared/lol-assets";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { animateEndScreen } from "../../shared/end-screen-animate";

@Component({
	selector: "app-whoami",
	standalone: true,
	imports: [FormsModule, ChampionSelectComponent, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./whoami.component.html",
	styleUrl: "./whoami.component.scss",
})
export class WhoamiComponent {
	protected readonly championOptions = CHAMPION_OPTIONS;
	protected guessInput = "";
	protected readonly guessing = signal(false);
	private readonly now = signal(Date.now());

	protected readonly remainingSec = computed(() => {
		const deadline = this.whoami.turn()?.deadline;
		if (!deadline) return 0;
		return Math.max(0, Math.ceil((deadline - this.now()) / 1000));
	});

	protected readonly finished = computed(() => !!this.whoami.results());
	protected readonly isMyTurn = computed(() => this.whoami.turn()?.activePlayerId === this.room.myId());

	/** Ma propre carte (champion masque tant que pas trouve). */
	protected readonly me = computed(() =>
		this.whoami.assignments().find((a) => a.playerId === this.room.myId()) ?? null,
	);
	/** Les cartes des autres joueurs, avec leur champion visible. */
	protected readonly others = computed(() =>
		this.whoami.assignments().filter((a) => a.playerId !== this.room.myId()),
	);

	/** Suis-je attendu pour repondre a la question en cours ? */
	protected readonly shouldAnswer = computed(() => {
		const turn = this.whoami.turn();
		return !!turn && turn.phase === "answering" && !this.isMyTurn() && !this.whoami.myAnswered();
	});

	protected readonly scoreRows = computed(() => this.whoami.results()?.rows ?? []);

	private readonly hostElement = inject(ElementRef<HTMLElement>);

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly whoami: WhoamiService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => clearInterval(ticker));
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// TURN...) peuvent avoir ete emis avant que ce composant n'existe.
		this.whoami.requestState();
		effect(() => {
			if (this.whoami.results()) animateEndScreen(this.hostElement.nativeElement);
		});
		// Nouveau tour/nouvelle question : on referme le panneau de devinette.
		effect(() => {
			this.whoami.turn();
			this.guessing.set(false);
		});
	}

	square(name: string): string {
		return championSquareUrl(name);
	}

	answer(value: boolean): void {
		this.whoami.answer(value);
	}

	nextQuestion(): void {
		this.whoami.nextQuestion();
	}

	pass(): void {
		this.whoami.pass();
	}

	openGuess(): void {
		this.guessing.set(true);
	}

	submitGuess(): void {
		const name = this.guessInput.trim();
		if (!name) return;
		this.whoami.guess(name);
		this.guessInput = "";
		this.guessing.set(false);
	}

	verdictLabel(verdict: "oui" | "non" | "egalite"): string {
		return verdict === "oui" ? "OUI" : verdict === "non" ? "NON" : "ÉGALITÉ";
	}
}
