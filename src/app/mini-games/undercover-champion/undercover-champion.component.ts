import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	computed,
	effect,
	inject,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { UndercoverService } from "../../core/services/undercover.service";
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

const RESULT_STAGE_LABELS = [
	"Voir les mots",
	"Voir les deux tours",
	"Voir les scores",
];

@Component({
	selector: "app-undercover-champion",
	standalone: true,
	imports: [FormsModule, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./undercover-champion.component.html",
	styleUrl: "./undercover-champion.component.scss",
})
export class UndercoverChampionComponent {
	protected wordInput = "";
	protected readonly resultStage = signal(0);
	protected readonly submittedToMix = signal(false);
	private readonly now = signal(Date.now());
	/** Pilote le flip 3D de la carte du mot secret (dos -> face). */
	protected readonly wordFlipped = signal(false);
	/** Suspense avant le reveal final : petit delai dramatique avant d'afficher l'identite. */
	protected readonly suspense = signal(false);

	protected readonly resultStageLabels = RESULT_STAGE_LABELS;

	protected readonly isMyTurn = computed(
		() => this.uc.activeTurn()?.playerId === this.room.myId(),
	);
	protected readonly activePlayerPseudo = computed(() => {
		const id = this.uc.activeTurn()?.playerId;
		return this.uc.turnOrder().find((p) => p.id === id)?.pseudo ?? "Quelqu'un";
	});
	protected readonly activePlayer = computed(() => {
		const id = this.uc.activeTurn()?.playerId;
		return this.uc.turnOrder().find((p) => p.id === id) ?? null;
	});
	protected readonly currentRound = computed(
		() => this.uc.activeTurn()?.round ?? 1,
	);
	protected readonly remainingRatio = computed(() => {
		const turn = this.uc.activeTurn();
		if (!turn) return 0;
		const remaining = Math.max(0, turn.deadline - this.now());
		return Math.min(1, remaining / this.uc.turnDurationMs());
	});
	protected readonly remainingSeconds = computed(() => {
		const turn = this.uc.activeTurn();
		if (!turn) return 0;
		return Math.max(0, Math.ceil((turn.deadline - this.now()) / 1000));
	});
	protected readonly wordsRound1 = computed(() =>
		this.uc.words().filter((w) => w.round === 1),
	);
	protected readonly wordsRound2 = computed(() =>
		this.uc.words().filter((w) => w.round === 2),
	);
	protected readonly wordsByPlayer = computed(() => {
		const results = this.uc.results();
		if (!results) return [];
		return this.uc.turnOrder().map((player) => ({
			playerId: player.id,
			pseudo: player.pseudo,
			turn1: results.words.find(
				(w) => w.playerId === player.id && w.round === 1,
			),
			turn2: results.words.find(
				(w) => w.playerId === player.id && w.round === 2,
			),
		}));
	});
	protected readonly scoreRows = computed(() => {
		const results = this.uc.results();
		if (!results) return [];
		return this.uc
			.turnOrder()
			.map((p) => ({
				id: p.id,
				pseudo: p.pseudo,
				points: results.scores[p.id] ?? 0,
			}))
			.sort((a, b) => b.points - a.points);
	});
	protected readonly resultStageLabel = computed(
		() => RESULT_STAGE_LABELS[this.resultStage()] ?? "Suivant",
	);
	/** Tally en live pendant le vote : nombre de votes recus par joueur, pour remplir les barres. */
	protected readonly voteTally = computed(() => {
		const votes = this.uc.voteProgress()?.votes ?? {};
		return Object.values(votes).reduce<Record<string, number>>((acc, targetId) => {
			acc[targetId] = (acc[targetId] ?? 0) + 1;
			return acc;
		}, {});
	});
	protected readonly voteTotalCast = computed(
		() => Object.keys(this.uc.voteProgress()?.votes ?? {}).length,
	);

	private readonly hostElement = inject(ElementRef<HTMLElement>);

	/** Timers de mise en scene : suivis en champ pour etre annules a chaque relance ET a la destruction (sinon un son/flip peut se jouer apres la fin de la manche en Party Mix). */
	private flipTimer?: ReturnType<typeof setTimeout>;
	private flipSfxTimer?: ReturnType<typeof setTimeout>;
	private revealTimer?: ReturnType<typeof setTimeout>;

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly uc: UndercoverService,
		private readonly audio: AudioService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => {
			clearInterval(ticker);
			clearTimeout(this.flipTimer);
			clearTimeout(this.flipSfxTimer);
			clearTimeout(this.revealTimer);
		});
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// REVEAL...) peuvent avoir ete emis par le serveur avant que ce
		// composant (et les listeners d'UndercoverService) n'existent.
		this.uc.requestState();

		// Reveal du mot secret : la carte punch a l'ecran, puis se retourne avec un impact sonore.
		effect(() => {
			const word = this.uc.myWord();
			if (this.uc.phase() !== "reveal" || !word) return;
			this.wordFlipped.set(false);
			clearTimeout(this.flipTimer);
			clearTimeout(this.flipSfxTimer);
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".word-card-3d"));
				this.flipTimer = setTimeout(() => {
					this.wordFlipped.set(true);
					this.audio.play("whoosh", { volume: 0.6 });
					this.flipSfxTimer = setTimeout(() => this.audio.play("impact", { volume: 0.7 }), 260);
				}, 550);
			});
		});

		// Tour actif : le joueur qui parle prend toute la place, entree punchee.
		effect(() => {
			const turn = this.uc.activeTurn();
			if (this.uc.phase() !== "turns" || !turn) return;
			this.audio.play("swap", { volume: 0.6 });
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".active-spotlight"));
				slideUp(host.querySelector(".turn-input-bar"), { delay: 0.1 });
			});
		});

		// Battement dans les 5 dernieres secondes du tour.
		effect(() => {
			const secondsLeft = this.remainingSeconds();
			if (this.uc.phase() === "turns" && secondsLeft > 0 && secondsLeft <= 5) {
				this.audio.play("timer-urgent", { volume: 0.55 });
			}
		});

		// Entree de la phase de vote.
		effect(() => {
			if (this.uc.phase() !== "vote") return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".vote-title"));
				slideUp(host.querySelector(".vote-grid"), { delay: 0.1 });
			});
		});

		// Reveal final : suspense (delai dramatique) puis identite + particules du camp gagnant.
		effect(() => {
			const results = this.uc.results();
			if (this.uc.phase() !== "results" || !results) return;
			this.resultStage.set(0);
			this.suspense.set(true);
			this.audio.play("countdown-tick", { volume: 0.5 });
			const host = this.hostElement.nativeElement;
			requestAnimationFrame(() => punchIn(host.querySelector(".mystery-mask")));
			clearTimeout(this.revealTimer);
			this.revealTimer = setTimeout(() => {
				this.suspense.set(false);
				this.audio.play("reveal", { volume: 0.8 });
				requestAnimationFrame(() => {
					const stage = host.querySelector(".results-stage") as HTMLElement | null;
					punchIn(host.querySelector(".reveal-identity"));
					this.audio.play(results.found ? "round-win" : "impact", { volume: 0.7 });
					burstParticles(stage, {
						colors: results.found
							? ["#3fd67a", "#f0e6d2", "#6c5ce7"]
							: ["#c13c4d", "#6c5ce7", "#1a1230"],
						count: 44,
					});
				});
			}, 1600);
		});
	}

	avatarColor(id: string): string {
		let hash = 0;
		for (let i = 0; i < id.length; i++)
			hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
		return `hsl(${hash % 360}, 62%, 52%)`;
	}

	initials(pseudo: string): string {
		return pseudo.trim().slice(0, 2).toUpperCase();
	}

	acknowledgeReveal(): void {
		this.uc.acknowledgeReveal();
		this.audio.play("ui-click", { volume: 0.6 });
	}

	submitWord(): void {
		const word = this.wordInput.trim();
		if (!word || !this.isMyTurn()) {
			if (!word) shake(this.hostElement.nativeElement.querySelector(".turn-input-bar"));
			return;
		}
		this.uc.submitWord(word);
		this.wordInput = "";
		this.audio.play("whoosh", { volume: 0.5 });
	}

	vote(targetId: string): void {
		this.uc.submitVote(targetId);
		this.audio.play("ui-click", { volume: 0.7 });
		requestAnimationFrame(() =>
			pulse(this.hostElement.nativeElement.querySelector(".vote-card.selected")),
		);
	}

	votersFor(targetId: string) {
		const votes = this.uc.voteProgress()?.votes ?? {};
		return this.uc.turnOrder().filter((p) => votes[p.id] === targetId);
	}

	voteTallyPct(playerId: string): number {
		const total = this.voteTotalCast();
		if (total <= 0) return 0;
		return ((this.voteTally()[playerId] ?? 0) / total) * 100;
	}

	nextResultStage(): void {
		if (this.resultStage() >= 3) return;
		this.resultStage.update((s) => s + 1);
		this.audio.play("ui-click", { volume: 0.6 });
		requestAnimationFrame(() => {
			const host = this.hostElement.nativeElement;
			punchIn(host.querySelector(".results-stage > div:not(.reveal-mystery)"));
		});
		if (this.resultStage() === 3) {
			this.submitMix();
			// Ecran de scores final : count-up cinematique sur les points (marqueurs [data-count-up]).
			animateEndScreen(this.hostElement.nativeElement, {
				onCountTick: () => this.audio.play("score-tick", { volume: 0.4 }),
			});
		}
	}

	private submitMix(): void {
		if (!this.mix.active() || this.submittedToMix()) return;
		this.submittedToMix.set(true);
		const results = this.uc.results();
		if (!results) return;
		const points = results.scores[this.room.myId() ?? ""] ?? 0;
		this.room.submitMixSegment(points, results.summary);
	}
}
