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
import { animateEndScreen } from "../../shared/end-screen-animate";

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

	private readonly hostElement = inject(ElementRef<HTMLElement>);

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly lastSurvivor: LastSurvivorService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => clearInterval(ticker));
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// ROUND_RESULT...) peuvent avoir ete emis avant que ce composant n'existe.
		this.lastSurvivor.requestState();
		effect(() => {
			if (this.lastSurvivor.results()) {
				this.submitMix();
				animateEndScreen(this.hostElement.nativeElement);
			}
		});
	}

	square(name: string): string {
		return championSquareUrl(name);
	}

	vote(label: string): void {
		this.lastSurvivor.vote(label);
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
