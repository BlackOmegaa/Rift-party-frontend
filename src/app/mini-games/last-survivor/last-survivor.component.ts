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
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { LastSurvivorService } from "../../core/services/last-survivor.service";
import { championSquareUrl } from "../../shared/lol-assets";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { AudioService } from "../../core/services/audio.service";
import { animateEndScreen } from "../../shared/end-screen-animate";
import {
	burstParticles,
	pulse,
	punchIn,
	shake,
	slideUp,
} from "../../shared/cinematic/cinematic";

@Component({
	selector: "app-last-survivor",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./last-survivor.component.html",
	styleUrl: "./last-survivor.component.scss",
})
export class LastSurvivorComponent {
	protected readonly submittedToMix = signal(false);
	private readonly now = signal(Date.now());

	protected readonly remainingSec = computed(() => {
		const deadline = this.lastSurvivor.deadline();
		if (!deadline || this.lastSurvivor.phase() !== "voting") return 0;
		return Math.max(0, Math.ceil((deadline - this.now()) / 1000));
	});

	protected readonly finished = computed(() => !!this.lastSurvivor.results());

	protected readonly scoreRows = computed(() => this.lastSurvivor.results()?.rows ?? []);

	/** Tally de la manche revelee, du plus vise au moins vise, avec marquage de l'elimine. */
	protected readonly revealRows = computed(() => {
		const round = this.lastSurvivor.lastRound();
		if (!round) return [];
		return round.tallies.map((t) => ({
			...t,
			eliminated: t.label === round.eliminated.label,
		}));
	});

	protected readonly myRoundPoints = computed(() => {
		const round = this.lastSurvivor.lastRound();
		if (!round) return 0;
		return round.roundPoints[this.room.myId() ?? ""] ?? 0;
	});

	protected readonly isFinalElimination = computed(() => {
		const round = this.lastSurvivor.lastRound();
		return !!round && round.remaining.length <= 1;
	});

	/** Nombre de survivants restants, pour le HUD "X survivants restants". */
	protected readonly survivorCount = computed(() => {
		if (this.lastSurvivor.phase() === "reveal") {
			return this.lastSurvivor.lastRound()?.remaining.length ?? this.lastSurvivor.candidates().length;
		}
		return this.lastSurvivor.candidates().length;
	});

	private readonly hostElement = inject(ElementRef<HTMLElement>);
	private wasVoting = false;

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly lastSurvivor: LastSurvivorService,
		private readonly audio: AudioService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => clearInterval(ticker));
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// ROUND_RESULT...) peuvent avoir ete emis avant que ce composant n'existe.
		this.lastSurvivor.requestState();

		effect(() => {
			if (this.lastSurvivor.results()) {
				this.submitMix();
				const host = this.hostElement.nativeElement;
				const isVictory = !!this.lastSurvivor.results()?.winner;
				this.audio.play(isVictory ? "fanfare" : "reveal");
				animateEndScreen(host);
				requestAnimationFrame(() =>
					burstParticles(host.querySelector(".end-screen"), {
						count: 52,
						colors: ["#c13c4d", "#ff8a9a", "#f0e6d2"],
					}),
				);
			}
		});

		// Battement sourd sur les 5 dernieres secondes du vote.
		effect(() => {
			const secondsLeft = this.remainingSec();
			if (this.lastSurvivor.phase() === "voting" && secondsLeft > 0 && secondsLeft <= 5) {
				this.audio.play("timer-urgent", { volume: 0.7 });
			}
		});

		// Entree cinematique a chaque nouvelle manche de vote.
		effect(() => {
			const phase = this.lastSurvivor.phase();
			this.lastSurvivor.roundNumber();
			if (phase !== "voting") {
				this.wasVoting = false;
				return;
			}
			if (this.wasVoting) return;
			this.wasVoting = true;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".target-splash"));
				slideUp(host.querySelector(".candidates-bar"), { delay: 0.1 });
			});
		});

		// Reveal cinematique de l'elimination : impact sonore + shake sur le portrait elimine.
		effect(() => {
			const round = this.lastSurvivor.lastRound();
			if (!round) return;
			const host = this.hostElement.nativeElement;
			const isFinal = round.remaining.length <= 1;
			this.audio.play("impact");
			this.audio.play("wrong", { volume: 0.6 });
			if (isFinal) this.audio.play("round-win");
			requestAnimationFrame(() => {
				punchIn(host.querySelector(".reveal-splash"));
				const eliminatedCard = host.querySelector(".tally-row.eliminated");
				shake(eliminatedCard);
				pulse(host.querySelector(".score-orb"));
				if (isFinal) {
					burstParticles(host.querySelector(".reveal-stage"), {
						count: 60,
						colors: ["#c13c4d", "#ff8a9a", "#f0e6d2", "#c8aa6e"],
					});
				}
			});
		});
	}

	square(name: string): string {
		return championSquareUrl(name);
	}

	vote(label: string): void {
		this.lastSurvivor.vote(label);
		this.audio.play("ui-click");
	}

	next(): void {
		if (!this.room.isHost()) return;
		this.lastSurvivor.next();
	}

	votersLine(voters: { pseudo: string }[]): string {
		return voters.map((v) => v.pseudo).join(", ");
	}

	private submitMix(): void {
		if (!this.mix.active() || this.submittedToMix()) return;
		this.submittedToMix.set(true);
		const results = this.lastSurvivor.results();
		if (!results) return;
		const points = results.scores[this.room.myId() ?? ""] ?? 0;
		this.room.submitMixSegment(points, results.summary);
	}
}
