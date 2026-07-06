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
import { AudioService } from "../../core/services/audio.service";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { animateEndScreen } from "../../shared/end-screen-animate";
import {
	burstParticles,
	floatScore,
	pulse,
	punchIn,
	shake,
	slideUp,
} from "../../shared/cinematic/cinematic";
import { gsap } from "gsap";

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
	/** Suspense avant verdict : le bouton "Valider" declenche un court suspens avant que whoami:guess-result n'arrive/s'affiche. */
	protected readonly suspense = signal(false);
	private readonly now = signal(Date.now());

	/** Le service n'expose que la deadline ; le total est le meme reglage synchronise que les autres jeux. */
	protected timerPct(): number {
		return Math.max(0, Math.min(100, (this.remainingSec() / this.settings.roundTimeSec()) * 100));
	}
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

	/** Set des playerId dont la carte est deja retournee (pour ne jouer le flip qu'une seule fois). */
	private readonly flippedCards = new Set<string>();
	private previousLastGuess: unknown = null;
	private suspenseTimer?: ReturnType<typeof setTimeout>;

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly whoami: WhoamiService,
		private readonly audio: AudioService,
		private readonly settings: GameSettingsService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => {
			clearInterval(ticker);
			clearTimeout(this.suspenseTimer);
		});
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// TURN...) peuvent avoir ete emis avant que ce composant n'existe.
		this.whoami.requestState();

		// Fin de partie : meme traitement cinematique que Guess The Champ (son + particules + compteur).
		effect(() => {
			if (!this.finished()) return;
			this.audio.play("fanfare");
			const host = this.hostElement.nativeElement;
			animateEndScreen(host, {
				onCountTick: () => this.audio.play("score-tick", { volume: 0.4 }),
			});
			requestAnimationFrame(() => burstParticles(host.querySelector(".end-screen"), { count: 42 }));
		});

		// Nouveau tour/nouvelle question : on referme le panneau de devinette + reset suspense, et on ponctue au son.
		effect(() => {
			const turn = this.whoami.turn();
			this.guessing.set(false);
			this.suspense.set(false);
			clearTimeout(this.suspenseTimer);
			if (!turn) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				if (turn.phase === "answering") {
					this.audio.play("swap", { volume: 0.6 });
					punchIn(host.querySelector(".question-mega"));
					slideUp(host.querySelector(".answer-row"), { delay: 0.1 });
				} else {
					punchIn(host.querySelector(".verdict-panel"));
					slideUp(host.querySelector(".decision-row"), { delay: 0.12 });
				}
			});
		});

		// Verdict oui/non de la question en cours : petit feedback sonore + shake si "non".
		effect(() => {
			const turn = this.whoami.turn();
			const lq = turn?.lastQuestion;
			if (!lq || turn!.phase !== "decision") return;
			requestAnimationFrame(() => {
				const panel = this.hostElement.nativeElement.querySelector(".verdict-panel") as HTMLElement | null;
				if (lq.verdict === "oui") {
					this.audio.play("correct", { volume: 0.55 });
					pulse(panel);
				} else if (lq.verdict === "non") {
					this.audio.play("wrong", { volume: 0.5 });
					shake(panel);
				} else {
					this.audio.play("ui-click", { volume: 0.5 });
				}
			});
		});

		// Compte a rebours final tendu (5 dernieres secondes) : meme battement que les autres jeux.
		effect(() => {
			const turn = this.whoami.turn();
			const secondsLeft = this.remainingSec();
			if (turn && secondsLeft > 0 && secondsLeft <= 5) {
				this.audio.play("timer-urgent", { volume: 0.6 });
			}
		});

		// Resultat d'une tentative de deviner : reveal cinematique (carte qui se retourne, particules, son).
		effect(() => {
			const guess = this.whoami.lastGuess();
			if (!guess || guess === this.previousLastGuess) return;
			this.previousLastGuess = guess;
			this.suspense.set(false);
			clearTimeout(this.suspenseTimer);
			const host = this.hostElement.nativeElement;
			const stage = host.querySelector(".guess-reveal") as HTMLElement | null;
			this.audio.play("reveal", { volume: 0.65 });
			if (guess.correct) {
				this.audio.play("round-win", { volume: 0.8 });
				burstParticles(stage, { colors: ["#0ac8b9", "#7dffb0", "#f0e6d2"], count: 46 });
				floatScore(stage, `+${guess.points}`, "#0ac8b9");
			} else {
				this.audio.play(guess.eliminated ? "timeout" : "wrong", { volume: 0.7 });
				shake(stage);
			}
			requestAnimationFrame(() => punchIn(host.querySelector(".guess-banner")));
		});

		// Carte retournee (champion trouve/echoue) : flip GSAP joue une seule fois par carte.
		effect(() => {
			const assignments = this.whoami.assignments();
			requestAnimationFrame(() => {
				for (const a of assignments) {
					if (!(a.found || a.failed) || this.flippedCards.has(a.playerId)) continue;
					this.flippedCards.add(a.playerId);
					const card = this.hostElement.nativeElement.querySelector(
						`[data-player-card="${a.playerId}"]`,
					) as HTMLElement | null;
					this.flipCard(card);
				}
			});
		});
	}

	private flipCard(card: HTMLElement | null): void {
		if (!card) return;
		gsap.killTweensOf(card);
		gsap.fromTo(
			card,
			{ rotateY: 0 },
			{
				rotateY: 180,
				duration: 0.7,
				ease: "power2.inOut",
				transformPerspective: 900,
			},
		);
	}

	square(name: string): string {
		return championSquareUrl(name);
	}

	answer(value: boolean): void {
		this.audio.play("ui-click", { volume: 0.6 });
		this.whoami.answer(value);
	}

	nextQuestion(): void {
		this.audio.play("ui-click", { volume: 0.6 });
		this.whoami.nextQuestion();
	}

	pass(): void {
		this.audio.play("ui-click", { volume: 0.5 });
		this.whoami.pass();
	}

	openGuess(): void {
		this.audio.play("ui-click", { volume: 0.6 });
		this.guessing.set(true);
	}

	closeGuess(): void {
		this.guessing.set(false);
	}

	/** Petit suspens avant l'envoi effectif : laisse le temps au joueur de sentir la tension du pari. */
	submitGuess(): void {
		const name = this.guessInput.trim();
		if (!name || this.suspense()) return;
		this.audio.play("whoosh", { volume: 0.55 });
		this.suspense.set(true);
		this.guessing.set(false);
		clearTimeout(this.suspenseTimer);
		this.suspenseTimer = setTimeout(() => {
			this.whoami.guess(name);
		}, 900);
		this.guessInput = "";
	}

	verdictLabel(verdict: "oui" | "non" | "egalite"): string {
		return verdict === "oui" ? "OUI" : verdict === "non" ? "NON" : "ÉGALITÉ";
	}
}
