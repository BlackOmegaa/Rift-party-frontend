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
import {
	CHAMPION_OPTIONS,
	championSplashUrl,
	championSquareUrl,
	normalizeChampionName,
} from "../../shared/lol-assets";
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

const FUSIONS = [
	{
		a: "Yasuo",
		b: "Jhin",
		name: "Yashinh",
		vibe: "Le vent, mais avec une obsession pour le chiffre 4.",
	},
	{
		a: "Thresh",
		b: "Pyke",
		name: "Thryke",
		vibe: "Lanterne d'un côté, harpon de l'autre, et une exécution qui prend une photo souvenir.",
	},
	{
		a: "Lux",
		b: "Morgana",
		name: "Luxgana",
		vibe: "Deux racines, un seul verdict : tu ne bouges plus.",
	},
	{
		a: "Zed",
		b: "Shen",
		name: "Zhen",
		vibe: "Deux ninjas, deux philosophies, zéro discussion saine.",
	},
	{
		a: "Jinx",
		b: "Zeri",
		name: "Jineri",
		vibe: "Électricité et roquettes : t'auras à peine le temps de courir.",
	},
	{
		a: "Sett",
		b: "Braum",
		name: "Brautt",
		vibe: "Un bouclier humain d'un côté, un crochet humain de l'autre.",
	},
	{
		a: "Ahri",
		b: "Evelynn",
		name: "Ahrilynn",
		vibe: "Charme d'un côté, invisibilité de l'autre : tu ne verras jamais venir la mort.",
	},
	{
		a: "Draven",
		b: "Darius",
		name: "Dravarius",
		vibe: "Les haches reviennent, le tranchant s'accumule, et l'exécution à 5 stacks ne pardonne pas.",
	},
	{
		a: "Yuumi",
		b: "Rengar",
		name: "Yuumgar",
		vibe: "Il bondit du buisson, elle ronronne sur ton dos. Bonne chance pour t'échapper.",
	},
	{
		a: "Wukong",
		b: "Shaco",
		name: "Wuco",
		vibe: "Un leurre, une invisibilité, et une hallucination qui rit dans ton dos.",
	},
	{
		a: "Malphite",
		b: "Rammus",
		name: "Malmmus",
		vibe: "Un caillou increvable qui roule vers toi, et tu ne peux vraiment rien faire.",
	},
	{
		a: "Teemo",
		b: "Shaco",
		name: "Teeco",
		vibe: "La map entière devient un piège.",
	},
	{
		a: "Blitzcrank",
		b: "Nautilus",
		name: "Blitzilus",
		vibe: "Une main de fer qui t'attire, une ancre qui t'immobilise, et la botlane est finie.",
	},
	{
		a: "Vayne",
		b: "Kai'Sa",
		name: "Vain'Sa",
		vibe: "Dégâts en %HP, missiles qui suivent, et les tanks qui pleurent en silence.",
	},
	{
		a: "Katarina",
		b: "Samira",
		name: "Katamira",
		vibe: "Deux resets, un dash, et un style meter que plus personne ne suit.",
	},
	{
		a: "Aatrox",
		b: "Mordekaiser",
		name: "Aatrokaiser",
		vibe: "L'un se soigne trop pour mourir, l'autre t'emmène dans une arène dont personne ne peut te sauver.",
	},
	{
		a: "Nasus",
		b: "Veigar",
		name: "Nasigar",
		vibe: "Chaque creep tué, chaque stack grimpé, et ta volonté de vivre qui redescend.",
	},
	{
		a: "Ekko",
		b: "Zilean",
		name: "Ekkean",
		vibe: "L'un rembobine le temps pour annuler sa propre mort, l'autre ressuscite qui il veut.",
	},
	{
		a: "Ashe",
		b: "Sejuani",
		name: "Ashjuani",
		vibe: "Une flèche qui stun depuis l'autre bout de la map, un sanglier qui stun de près : personne n'échappe au CC.",
	},
	{
		a: "Riven",
		b: "Irelia",
		name: "Rivelia",
		vibe: "Trois petits bonds et un bouclier d'un côté, des lames plantées pour rebondir dessus de l'autre.",
	},
	{
		a: "Fizz",
		b: "Zoe",
		name: "Fizoe",
		vibe: "Une bulle qui endort, un poisson intouchable : le counter n'existe pas.",
	},
	{
		a: "Lee Sin",
		b: "Yasuo",
		name: "Lee Suo",
		vibe: "Un coup de pied qui propulse en l'air, une tornade qui empêche d'en redescendre.",
	},
	{
		a: "Garen",
		b: "Darius",
		name: "Gararius",
		vibe: "Deux ultimates, un seul mot : exécution. GG.",
	},
	{
		a: "Sona",
		b: "Seraphine",
		name: "Sonaphine",
		vibe: "Une mélodie qui soigne, un accord final qui fait danser tout le monde contre son gré.",
	},
	{
		a: "Kayn",
		b: "Viego",
		name: "Kayego",
		vibe: "Il veut ton corps, ton âme, et ton ultime.",
	},
];

@Component({
	selector: "app-fusion-champions",
	standalone: true,
	imports: [FormsModule, ChampionSelectComponent, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./fusion-champions.component.html",
	styleUrl: "./fusion-champions.component.scss",
})
export class FusionChampionsComponent implements OnDestroy {
	private fusions = [...FUSIONS];

	square(name: string) {
		return championSquareUrl(name);
	}

	private shuffleFusions() {
		this.fusions = [...FUSIONS];

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
	/** Verdict individuel par moitie de fusion, pour animer chaque champion separement. */
	firstOk = signal(false);
	secondOk = signal(false);
	lastGain = signal(0);
	/**
	 * Vrai pendant le changement de round : masque les deux splashs instantanement
	 * (transition CSS coupee) jusqu'au `load` des nouvelles images. Sans ca, la
	 * nouvelle paire apparait en clair ~1s le temps que le deflou du round
	 * precedent se re-applique en sens inverse.
	 */
	splashesPending = signal(0);
	private autoNextTimer?: ReturnType<typeof setTimeout>;
	/**
	 * Vrai apres ngOnDestroy : le handler socket de onGameRestarted n'est jamais
	 * desinscrit, un GAME_RESTARTED tardif relancerait donc restart() (et son
	 * RoundTimer) sur une instance morte — timer fantome qui peut appeler
	 * submitMixSegment pendant le jeu suivant du Party Mix.
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
				punchIn(host.querySelector(".fusion-stage-art"));
				slideUp(host.querySelector(".fusion-vibe"), { delay: 0.08 });
				slideUp(host.querySelector(".action-bar"), { delay: 0.14 });
			});
		});
	}
	ngOnDestroy(): void {
		this.destroyed = true;
		this.timer.stop();
		clearTimeout(this.autoNextTimer);
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
		this.scheduleAutoNext();
	}
	/** Enchaine automatiquement apres le verdict pour garder le rythme (le bouton Suivant reste dispo pour zapper). */
	private scheduleAutoNext() {
		clearTimeout(this.autoNextTimer);
		this.autoNextTimer = setTimeout(() => this.nextRound(), 3200);
	}
	splash(name: string) {
		return championSplashUrl(name);
	}
	onSplashLoaded() {
		this.splashesPending.update((n) => Math.max(0, n - 1));
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
		const normA = normalizeChampionName(f.a);
		const normB = normalizeChampionName(f.b);
		const hasA = vals.includes(normA);
		const hasB = vals.includes(normB);
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
		this.scheduleAutoNext();
	}
	nextRound() {
		if (!this.locked()) return;
		clearTimeout(this.autoNextTimer);
		this.audio.play("swap", { volume: 0.7 });
		this.splashesPending.set(2);
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
		this.locked.set(false);
		this.startRoundTimer();
	}
	submitMix() {
		if (this.submittedToMix()) return;
		this.submittedToMix.set(true);
		this.room.submitMixSegment(
			this.score() * 10,
			`Fusion : ${this.correctCount()}/${this.maxRounds()} duos trouvés.`,
		);
	}
	requestRestart() {
		if (!this.room.isHost()) return;
		this.room.restartGame("fusion-champions");
	}
	restart() {
		this.shuffleFusions();
		clearTimeout(this.autoNextTimer);
		this.splashesPending.set(2);
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.correctCount.set(0);
		this.first = "";
		this.second = "";
		this.verdict.set(null);
		this.firstOk.set(false);
		this.secondOk.set(false);
		this.lastGain.set(0);
		this.locked.set(false);
		this.startRoundTimer();
	}
}
