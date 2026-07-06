import {
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	computed,
	inject,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { UndercoverService } from "../../core/services/undercover.service";
import { IconComponent } from "../../shared/components/icon/icon.component";

const RESULT_STAGE_LABELS = [
	"Revele l'identite",
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

	protected readonly resultStageLabels = RESULT_STAGE_LABELS;

	protected readonly isMyTurn = computed(
		() => this.uc.activeTurn()?.playerId === this.room.myId(),
	);
	protected readonly activePlayerPseudo = computed(() => {
		const id = this.uc.activeTurn()?.playerId;
		return this.uc.turnOrder().find((p) => p.id === id)?.pseudo ?? "Quelqu'un";
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

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly uc: UndercoverService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => clearInterval(ticker));
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// REVEAL...) peuvent avoir ete emis par le serveur avant que ce
		// composant (et les listeners d'UndercoverService) n'existent.
		this.uc.requestState();
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
	}

	submitWord(): void {
		const word = this.wordInput.trim();
		if (!word || !this.isMyTurn()) return;
		this.uc.submitWord(word);
		this.wordInput = "";
	}

	vote(targetId: string): void {
		this.uc.submitVote(targetId);
	}

	votersFor(targetId: string) {
		const votes = this.uc.voteProgress()?.votes ?? {};
		return this.uc.turnOrder().filter((p) => votes[p.id] === targetId);
	}

	nextResultStage(): void {
		if (this.resultStage() >= 4) return;
		this.resultStage.update((s) => s + 1);
		if (this.resultStage() === 4) this.submitMix();
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
