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
import { VotePartyService } from "../../core/services/vote-party.service";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { AudioService } from "../../core/services/audio.service";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { animateEndScreen } from "../../shared/end-screen-animate";
import {
	burstParticles,
	pulse,
	punchIn,
	slideUp,
} from "../../shared/cinematic/cinematic";

@Component({
	selector: "app-vote-party",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./vote-party.component.html",
	styleUrl: "./vote-party.component.scss",
})
export class VotePartyComponent {
	protected readonly submittedToMix = signal(false);
	private readonly now = signal(Date.now());

	protected readonly remainingSec = computed(() => {
		const deadline = this.voteParty.deadline();
		if (!deadline || this.voteParty.phase() !== "voting") return 0;
		return Math.max(0, Math.ceil((deadline - this.now()) / 1000));
	});

	/** Les cibles votables : tout le lobby sauf moi (pas de self-vote). */
	protected readonly targets = computed(() =>
		this.room.players().filter((p) => p.id !== this.room.myId()),
	);

	protected readonly finished = computed(() => !!this.voteParty.results());

	protected readonly scoreRows = computed(() => {
		const results = this.voteParty.results();
		if (!results) return [];
		return results.rows;
	});

	/**
	 * Lignes du classement de manche : tally + points de manche, avec mention "elu".
	 * Triees par nombre de voix desc pour que le rang affiche colle a l'ordre de
	 * revelation sequentielle piloté par `revealedCount`.
	 */
	protected readonly revealRows = computed(() => {
		const round = this.voteParty.lastRound();
		if (!round) return [];
		const maxVotes = Math.max(1, ...round.tallies.map((t) => t.votes));
		return [...round.tallies]
			.sort((a, b) => b.votes - a.votes)
			.map((t) => ({
				...t,
				elected: round.electedIds.includes(t.playerId),
				points: round.roundPoints[t.playerId] ?? 0,
				barPct: Math.max(6, Math.round((t.votes / maxVotes) * 100)),
			}));
	});

	protected readonly myRoundPoints = computed(() => {
		const round = this.voteParty.lastRound();
		if (!round) return 0;
		return round.roundPoints[this.room.myId() ?? ""] ?? 0;
	});

	protected readonly isLastRound = computed(() => {
		const round = this.voteParty.lastRound();
		return !!round && round.roundNumber >= round.totalRounds;
	});

	/** Piloté par le reveal séquentiel : tant que < revealRows().length, la barre n'est pas encore montée. */
	protected revealedCount = signal(0);
	private revealTimer?: ReturnType<typeof setTimeout>;

	protected readonly dots = computed(() =>
		Array.from({ length: Math.max(1, this.voteParty.totalRounds()) }),
	);

	/** Le service n'expose que la deadline ; le total est le meme reglage synchronise que les autres jeux. */
	protected timerPct(): number {
		if (!this.voteParty.deadline()) return 0;
		return Math.max(0, Math.min(100, (this.remainingSec() / this.settings.roundTimeSec()) * 100));
	}

	private readonly hostElement = inject(ElementRef<HTMLElement>);

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly voteParty: VotePartyService,
		private readonly audio: AudioService,
		private readonly settings: GameSettingsService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => {
			clearInterval(ticker);
			clearTimeout(this.revealTimer);
		});
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// ROUND_RESULT...) peuvent avoir ete emis avant que ce composant n'existe.
		this.voteParty.requestState();

		effect(() => {
			if (this.voteParty.results()) {
				this.submitMix();
				this.audio.play("fanfare");
				const host = this.hostElement.nativeElement;
				animateEndScreen(host, {
					onCountTick: () => this.audio.play("score-tick", { volume: 0.4 }),
				});
				requestAnimationFrame(() =>
					burstParticles(host.querySelector(".end-screen"), { count: 42 }),
				);
			}
		});

		// Battement sourd sur les 5 dernieres secondes du vote.
		effect(() => {
			const secondsLeft = this.remainingSec();
			if (
				this.voteParty.phase() === "voting" &&
				this.voteParty.myVote() === null &&
				secondsLeft > 0 &&
				secondsLeft <= 5
			) {
				this.audio.play("timer-urgent", { volume: 0.7 });
			}
		});

		// Entree animee de chaque question (punch sur la question, avatars qui montent).
		effect(() => {
			this.voteParty.roundNumber();
			if (this.voteParty.phase() !== "voting") return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".question-hero"));
				slideUp(host.querySelector(".targets"), { delay: 0.08 });
			});
		});

		// Sequence de revelation : la liste triee se remplit barre par barre,
		// avec un tick sonore a chaque incruste, puis fanfare + spotlight sur l'elu.
		effect(() => {
			const round = this.voteParty.lastRound();
			if (!round) return;
			this.revealedCount.set(0);
			clearTimeout(this.revealTimer);
			const rows = [...round.tallies].sort((a, b) => b.votes - a.votes);
			const host = this.hostElement.nativeElement;
			requestAnimationFrame(() => {
				punchIn(host.querySelector(".reveal-hero"));
			});
			const revealStep = (i: number) => {
				if (i >= rows.length) {
					const electedIds = round.electedIds;
					if (electedIds.length) {
						this.audio.play("round-win");
						requestAnimationFrame(() => {
							const stage = host.querySelector(".reveal-stage") as HTMLElement | null;
							burstParticles(stage, {
								colors: ["#ff4fd8", "#ffb0ec", "#f0e6d2"],
								count: 46,
							});
							const electedRows: NodeListOf<HTMLElement> = host.querySelectorAll(".tally-row.elected");
							electedRows.forEach((el) => pulse(el, 1.08));
						});
					}
					return;
				}
				this.revealedCount.set(i + 1);
				this.audio.play("score-tick", { volume: 0.5, rate: 1 + i * 0.04 });
				this.revealTimer = setTimeout(() => revealStep(i + 1), 420);
			};
			this.revealTimer = setTimeout(() => revealStep(0), 380);
		});
	}

	vote(targetId: string): void {
		if (this.voteParty.myVote() !== null) return;
		this.voteParty.vote(targetId);
		this.audio.play("ui-click");
		requestAnimationFrame(() => {
			const el = this.hostElement.nativeElement.querySelector(
				`.target[data-player-id="${CSS.escape(targetId)}"]`,
			);
			pulse(el, 1.18);
		});
	}

	votersLine(voters: { pseudo: string }[]): string {
		return voters.map((v) => v.pseudo).join(", ");
	}

	next(): void {
		if (!this.room.isHost()) return;
		this.audio.play("swap", { volume: 0.7 });
		this.voteParty.next();
	}

	private submitMix(): void {
		if (!this.mix.active() || this.submittedToMix()) return;
		this.submittedToMix.set(true);
		const results = this.voteParty.results();
		if (!results) return;
		const points = results.scores[this.room.myId() ?? ""] ?? 0;
		this.room.submitMixSegment(points, results.summary);
	}
}
