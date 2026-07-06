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
import { animateEndScreen } from "../../shared/end-screen-animate";

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

	/** Lignes du classement de manche : tally + points de manche, avec mention "elu". */
	protected readonly revealRows = computed(() => {
		const round = this.voteParty.lastRound();
		if (!round) return [];
		return round.tallies.map((t) => ({
			...t,
			elected: round.electedIds.includes(t.playerId),
			points: round.roundPoints[t.playerId] ?? 0,
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

	private readonly hostElement = inject(ElementRef<HTMLElement>);

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly voteParty: VotePartyService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => clearInterval(ticker));
		// Toujours se resynchroniser au montage : les events one-shot (START,
		// ROUND_RESULT...) peuvent avoir ete emis avant que ce composant n'existe.
		this.voteParty.requestState();
		effect(() => {
			if (this.voteParty.results()) {
				this.submitMix();
				animateEndScreen(this.hostElement.nativeElement);
			}
		});
	}

	vote(targetId: string): void {
		this.voteParty.vote(targetId);
	}

	votersLine(voters: { pseudo: string }[]): string {
		return voters.map((v) => v.pseudo).join(", ");
	}

	next(): void {
		if (!this.room.isHost()) return;
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
