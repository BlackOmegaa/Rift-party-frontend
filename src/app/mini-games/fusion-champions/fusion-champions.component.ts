import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	OnDestroy,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { TrackingService } from "../../core/services/tracking.service";
import { CHAMPION_OPTIONS, normalizeChampionName } from "../../shared/lol-assets";
import { ChampionSelectComponent } from "../../shared/components/champion-select/champion-select.component";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { AudioService } from "../../core/services/audio.service";
import { RoundTimer } from "../../shared/round-timer";
import { animateEndScreen } from "../../shared/end-screen-animate";
import {
	burstParticles,
	floatScore,
	pulse,
	punchIn,
	shake,
	slideUp,
} from "../../shared/cinematic/cinematic";
import { FUSIONS } from "./fusion-data";

@Component({
	selector: "app-fusion-champions",
	standalone: true,
	imports: [FormsModule, ChampionSelectComponent, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./fusion-champions.component.html",
	styleUrl: "./fusion-champions.component.scss",
})
export class FusionChampionsComponent implements OnDestroy {
	// Seules les fusions dont l'image a ete deposee (available) sont jouables.
	// Fallback defensif sur la liste complete si aucune n'est encore marquee.
	private static readonly PLAYABLE = FUSIONS.filter((f) => f.available).length
		? FUSIONS.filter((f) => f.available)
		: FUSIONS;
	private fusions = [...FusionChampionsComponent.PLAYABLE];

	private shuffleFusions() {
		this.fusions = [...FusionChampionsComponent.PLAYABLE];
		for (let i = this.fusions.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.fusions[i], this.fusions[j]] = [this.fusions[j], this.fusions[i]];
		}
	}

	protected readonly championOptions = CHAMPION_OPTIONS;
	protected readonly pointsPerFusion = 10;
	maxRounds = computed(() =>
		this.mix.active()
			? this.mix.roundSize()
			: this.settings.roundsFor("fusion-champions"),
	);
	index = signal(0);
	submittedToMix = signal(false);
	score = signal(0);
	correctCount = signal(0);
	locked = signal(false);
	/** Resultat du round en cours, pilote l'overlay de verdict cinematique. */
	verdict = signal<"correct" | "wrong" | "timeout" | null>(null);
	/** Verdict individuel par champion de la fusion, pour marquer chaque moitie. */
	firstOk = signal(false);
	secondOk = signal(false);
	lastGain = signal(0);
	/** "% de joueurs qui ont trouve" pour la fusion en cours (null tant que non charge/indispo). */
	foundPct = signal<number | null>(null);
	pctLoading = signal(false);
	private autoNextTimer?: ReturnType<typeof setTimeout>;
	/**
	 * Vrai apres ngOnDestroy : le handler socket de onGameRestarted n'est jamais
	 * desinscrit, un GAME_RESTARTED tardif relancerait donc restart() (et son
	 * RoundTimer) sur une instance morte.
	 */
	private destroyed = false;
	protected readonly timer = new RoundTimer();
	protected remainingSec = signal(0);
	first = "";
	second = "";
	fusion = computed(() => this.fusions[this.index() % this.fusions.length]);
	roundNumber = computed(() => this.index() + 1);
	finished = computed(() => this.index() >= this.maxRounds());
	protected readonly dots = computed(() =>
		Array.from({ length: this.maxRounds() }),
	);
	protected timerPct(): number {
		const total = this.settings.roundTimeSec();
		return total > 0
			? Math.max(0, Math.min(100, (this.remainingSec() / total) * 100))
			: 0;
	}
	protected leaderboardRows = computed(() => {
		const scores = this.mix.progress()?.scores ?? [];
		const byId = new Map(scores.map((s) => [s.playerId, s.points]));
		return this.room
			.players()
			.map((p) => ({ playerId: p.id, pseudo: p.pseudo, points: byId.get(p.id) ?? null }))
			.sort((a, b) => (b.points ?? -1) - (a.points ?? -1));
	});
	private readonly hostElement = inject(ElementRef<HTMLElement>);

	constructor(
		protected room: RoomService,
		protected mix: MixRuntimeService,
		protected settings: GameSettingsService,
		private readonly audio: AudioService,
		private readonly tracking: TrackingService,
	) {
		this.shuffleFusions();
		this.startRoundTimer();
		this.room.onGameRestarted((payload) => {
			if (this.destroyed) return;
			if (payload.gameId === "fusion-champions") this.restart();
		});
		effect(() => {
			if (!this.finished()) return;
			this.audio.play("fanfare");
			const host = this.hostElement.nativeElement;
			animateEndScreen(host, {
				onCountTick: () => this.audio.play("score-tick", { volume: 0.4 }),
			});
			requestAnimationFrame(() =>
				burstParticles(host.querySelector(".end-screen"), { count: 42 }),
			);
		});
		// Battement sourd sur les 5 dernieres secondes du timer.
		effect(() => {
			const secondsLeft = this.remainingSec();
			if (!this.locked() && secondsLeft > 0 && secondsLeft <= 5) {
				this.audio.play("timer-urgent", { volume: 0.7 });
			}
		});
		// Entree animee de chaque round (fusion qui punch, barre d'action qui glisse).
		effect(() => {
			this.index();
			if (this.finished()) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".fusion-image-wrap"));
				slideUp(host.querySelector(".action-bar"), { delay: 0.14 });
			});
		});
	}
	ngOnDestroy(): void {
		this.destroyed = true;
		this.timer.stop();
		clearTimeout(this.autoNextTimer);
	}

	/** URL de l'image de fusion (WebP optimisé dans assets/fusions/). */
	imageUrl(id: string): string {
		return `/assets/fusions/fusion-${id}.webp`;
	}

	/** "72 %" pour l'affichage, chaine vide si le % n'est pas (encore) disponible. */
	pctLabel(): string {
		const p = this.foundPct();
		return p === null ? "" : `${Math.round(p * 100)} %`;
	}

	private startRoundTimer() {
		this.timer.start(
			this.settings.roundTimeSec(),
			(secondsLeft) => this.remainingSec.set(secondsLeft),
			() => this.handleTimeout(),
		);
	}
	private handleTimeout() {
		if (this.locked()) return;
		this.lastGain.set(0);
		this.firstOk.set(false);
		this.secondOk.set(false);
		this.verdict.set("timeout");
		this.locked.set(true);
		this.audio.play("timeout");
		this.audio.play("reveal", { volume: 0.6 });
		void this.recordAndFetchPct(this.fusion().id, false);
		this.scheduleAutoNext();
	}
	/** Enchaine automatiquement apres le verdict pour garder le rythme. 5s : laisse le temps de lire le nom, la phrase et le %. */
	private scheduleAutoNext() {
		clearTimeout(this.autoNextTimer);
		this.autoNextTimer = setTimeout(() => this.nextRound(), 5000);
	}
	/** Enregistre le resultat (1re exposition cote serveur) et recupere le % de joueurs qui ont trouve. */
	private async recordAndFetchPct(fusionId: string, found: boolean): Promise<void> {
		this.foundPct.set(null);
		this.pctLoading.set(true);
		try {
			const res = await this.tracking.reportFusionResult(fusionId, found);
			this.foundPct.set(res.foundPct);
		} catch {
			this.foundPct.set(null);
		} finally {
			this.pctLoading.set(false);
		}
	}
	validate() {
		if (this.locked()) return;
		this.timer.stop();
		const host = this.hostElement.nativeElement;
		const stage = host.querySelector(".cine-stage") as HTMLElement | null;
		const vals = [
			normalizeChampionName(this.first),
			normalizeChampionName(this.second),
		];
		const f = this.fusion();
		const hasA = vals.includes(normalizeChampionName(f.a));
		const hasB = vals.includes(normalizeChampionName(f.b));
		this.firstOk.set(hasA);
		this.secondOk.set(hasB);
		const ok = hasA && hasB;
		if (ok) {
			const points = this.pointsPerFusion;
			this.lastGain.set(points);
			this.score.update((s) => s + 1);
			this.correctCount.update((c) => c + 1);
			this.verdict.set("correct");
			this.audio.play("correct");
			burstParticles(stage, {
				colors: ["#b673ff", "#e2c8ff", "#f0e6d2"],
				count: 36,
			});
			floatScore(stage, `+${points}`, "#b673ff");
			pulse(host.querySelector(".score-chip"));
		} else {
			this.lastGain.set(0);
			this.verdict.set("wrong");
			this.audio.play("wrong");
			shake(stage);
		}
		this.audio.play("reveal", { volume: 0.6 });
		this.locked.set(true);
		void this.recordAndFetchPct(f.id, ok);
		this.scheduleAutoNext();
	}
	nextRound() {
		if (!this.locked()) return;
		clearTimeout(this.autoNextTimer);
		this.audio.play("swap", { volume: 0.7 });
		this.index.update((i) => i + 1);
		if (this.finished()) {
			this.timer.stop();
			this.submitMix();
			return;
		}
		this.first = "";
		this.second = "";
		this.verdict.set(null);
		this.firstOk.set(false);
		this.secondOk.set(false);
		this.foundPct.set(null);
		this.locked.set(false);
		this.startRoundTimer();
	}
	submitMix() {
		if (this.submittedToMix()) return;
		this.submittedToMix.set(true);
		this.room.submitMixSegment(
			this.score() * 10,
			`Fusion : ${this.correctCount()}/${this.maxRounds()} fusions trouvées.`,
		);
	}
	requestRestart() {
		if (!this.room.isHost()) return;
		this.room.restartGame("fusion-champions");
	}
	restart() {
		this.shuffleFusions();
		clearTimeout(this.autoNextTimer);
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.correctCount.set(0);
		this.first = "";
		this.second = "";
		this.verdict.set(null);
		this.firstOk.set(false);
		this.secondOk.set(false);
		this.foundPct.set(null);
		this.lastGain.set(0);
		this.locked.set(false);
		this.startRoundTimer();
	}
}
