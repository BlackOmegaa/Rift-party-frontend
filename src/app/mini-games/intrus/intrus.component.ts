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
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { championSplashUrl, championSquareUrl } from "../../shared/lol-assets";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { RoundTimer } from "../../shared/round-timer";
import { animateEndScreen } from "../../shared/end-screen-animate";
import { AudioService } from "../../core/services/audio.service";
import {
	burstParticles,
	floatScore,
	pulse,
	punchIn,
	shake,
	slideUp,
} from "../../shared/cinematic/cinematic";

interface IntrusItem {
	/** Champion utilise pour l'illustration (square art), meme quand `label` montre un skin. */
	champion: string;
	label: string;
}
interface IntrusRound {
	group: IntrusItem[];
	intrus: IntrusItem;
	category: string;
	explanation: string;
}

const c = (name: string): IntrusItem => ({ champion: name, label: name });
const skin = (champion: string, label: string): IntrusItem => ({ champion, label });

const ROUNDS: IntrusRound[] = [
	{
		group: [c("Garen"), c("Lux"), c("Jarvan IV"), c("Fiora")],
		intrus: c("Darius"),
		category: "Region : Demacia",
		explanation: "Darius est Noxien, les quatre autres sont Demaciens.",
	},
	{
		group: [c("Darius"), c("Draven"), c("Katarina"), c("Swain")],
		intrus: c("Garen"),
		category: "Region : Noxus",
		explanation: "Garen est Demacien, les quatre autres viennent de Noxus.",
	},
	{
		group: [c("Yasuo"), c("Irelia"), c("Zed"), c("Akali")],
		intrus: c("Caitlyn"),
		category: "Region : Ionia",
		explanation: "Caitlyn vient de Piltover, les quatre autres sont Ioniens.",
	},
	{
		group: [c("Jayce"), c("Caitlyn"), c("Heimerdinger"), c("Camille")],
		intrus: c("Jinx"),
		category: "Region : Piltover",
		explanation: "Jinx vient de Zaun, les quatre autres sont de Piltover.",
	},
	{
		group: [c("Jinx"), c("Viktor"), c("Singed"), c("Dr. Mundo")],
		intrus: c("Braum"),
		category: "Region : Zaun",
		explanation: "Braum vient du Freljord, les quatre autres sont de Zaun.",
	},
	{
		group: [c("Braum"), c("Ashe"), c("Sejuani"), c("Olaf")],
		intrus: c("Diana"),
		category: "Region : Freljord",
		explanation: "Diana vient du Mont Targon, les quatre autres sont du Freljord.",
	},
	{
		group: [c("Azir"), c("Nasus"), c("Renekton"), c("Xerath")],
		intrus: c("Cho'Gath"),
		category: "Region : Shurima",
		explanation: "Cho'Gath vient du Neant, les quatre autres sont Shurimans.",
	},
	{
		group: [c("Cho'Gath"), c("Kog'Maw"), c("Kha'Zix"), c("Vel'Koz")],
		intrus: c("Miss Fortune"),
		category: "Region : le Neant",
		explanation: "Miss Fortune vient de Bilgewater, les quatre autres sont des creatures du Neant.",
	},
	{
		group: [c("Miss Fortune"), c("Gangplank"), c("Graves"), c("Twisted Fate")],
		intrus: c("Ashe"),
		category: "Region : Bilgewater",
		explanation: "Ashe vient du Freljord, les quatre autres sont de Bilgewater.",
	},
	{
		group: [c("Jinx"), c("Caitlyn"), c("Vayne"), c("Ashe")],
		intrus: c("Lux"),
		category: "Role : ADC",
		explanation: "Lux est mage, les quatre autres sont des tireurs (ADC).",
	},
	{
		group: [c("Thresh"), c("Braum"), c("Leona"), c("Nami")],
		intrus: c("Jhin"),
		category: "Role : Support",
		explanation: "Jhin est un tireur (ADC), les quatre autres sont supports.",
	},
	{
		group: [c("Lee Sin"), c("Vi"), c("Kha'Zix"), c("Master Yi")],
		intrus: c("Darius"),
		category: "Role : Jungle",
		explanation: "Darius joue top, les quatre autres sont junglers.",
	},
	{
		group: [c("Garen"), c("Fiora"), c("Camille"), c("Renekton")],
		intrus: c("Jarvan IV"),
		category: "Role : Top",
		explanation: "Jarvan IV joue jungle, les quatre autres jouent top.",
	},
	{
		group: [c("Malphite"), c("Ornn"), c("Rammus"), c("Sion")],
		intrus: c("Zed"),
		category: "Role : Tank",
		explanation: "Zed est un assassin, les quatre autres sont des tanks.",
	},
	{
		group: [c("Ahri"), c("Syndra"), c("Orianna"), c("Viktor")],
		intrus: c("Garen"),
		category: "Role : Mage",
		explanation: "Garen est un bruiser top-lane, les quatre autres sont des mages.",
	},
	{
		group: [c("Vayne"), c("Kai'Sa"), c("Ezreal"), c("Xayah")],
		intrus: c("Nami"),
		category: "Role : ADC",
		explanation: "Nami est support, les quatre autres sont des tireurs (ADC).",
	},
	{
		group: [c("Lux"), c("Ahri"), c("Annie"), c("Malzahar")],
		intrus: c("Akali"),
		category: "Ressource : Mana",
		explanation: "Akali utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Ahri"), c("Syndra"), c("Orianna"), c("Xerath")],
		intrus: c("Zed"),
		category: "Ressource : Mana",
		explanation: "Zed utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Ashe"), c("Caitlyn"), c("Jinx"), c("Sivir")],
		intrus: c("Tryndamere"),
		category: "Ressource : Mana",
		explanation: "Tryndamere utilise de la Fureur, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Illaoi"), c("Camille"), c("Fiora"), c("Darius")],
		intrus: c("Shen"),
		category: "Ressource : Mana",
		explanation: "Shen utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Amumu"), c("Sejuani"), c("Nunu & Willump"), c("Warwick")],
		intrus: c("Kha'Zix"),
		category: "Ressource : Mana",
		explanation: "Kha'Zix n'utilise aucune ressource, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Xerath"), c("Orianna"), c("Veigar"), c("Syndra")],
		intrus: c("Kennen"),
		category: "Ressource : Mana",
		explanation: "Kennen utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [
			skin("Yasuo", "PROJECT: Yasuo"),
			skin("Aatrox", "Blood Moon Aatrox"),
			skin("Miss Fortune", "Arcade Miss Fortune"),
			skin("Ahri", "Spirit Blossom Ahri"),
		],
		intrus: skin("Lux", "Elementalist Lux"),
		category: "Skin : rarete",
		explanation: "Elementalist Lux est un skin Ultimate (le palier le plus rare), les quatre autres sont des skins classiques.",
	},
	{
		group: [
			skin("Zed", "PROJECT: Zed"),
			skin("Senna", "High Noon Senna"),
			skin("Ahri", "K/DA Ahri"),
			skin("Jinx", "Star Guardian Jinx"),
		],
		intrus: skin("Sona", "DJ Sona"),
		category: "Skin : rarete",
		explanation: "DJ Sona est un skin Ultimate, les quatre autres sont des skins classiques.",
	},
];

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

@Component({
	selector: "app-intrus",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./intrus.component.html",
	styleUrl: "./intrus.component.scss",
})
export class IntrusComponent implements OnDestroy {
	private rounds: IntrusRound[] = [];

	protected readonly basePoints = 10;
	protected readonly maxRounds = computed(() =>
		this.mix.active() ? this.mix.roundSize() : this.settings.roundsFor("intrus"),
	);
	protected index = signal(0);
	protected submittedToMix = signal(false);
	protected score = signal(0);
	protected correctCount = signal(0);
	protected locked = signal(false);
	protected pickedIndex = signal<number | null>(null);
	protected items = signal<IntrusItem[]>([]);
	protected intrusIndex = signal(0);
	/** Resultat du round en cours, pilote le style du stage cinematique (glow vert/rouge). */
	protected verdict = signal<"correct" | "wrong" | "timeout" | null>(null);
	private autoNextTimer?: ReturnType<typeof setTimeout>;
	protected readonly timer = new RoundTimer();
	protected remainingSec = signal(0);

	round = computed(() => this.rounds[this.index() % this.rounds.length]);
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
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly settings: GameSettingsService,
		private readonly audio: AudioService,
	) {
		this.shuffleRounds();
		this.setupRound();
		this.startRoundTimer();
		this.room.onGameRestarted((payload) => {
			if (payload.gameId === "intrus") this.restart();
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
		// Entree animee de chaque round (grille qui punch, barre d'action qui glisse).
		effect(() => {
			this.index();
			if (this.finished()) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".suspects-grid"));
				slideUp(host.querySelector(".stage-caption"), { delay: 0.06 });
				slideUp(host.querySelector(".action-bar"), { delay: 0.12 });
			});
		});
	}

	ngOnDestroy(): void {
		this.timer.stop();
		clearTimeout(this.autoNextTimer);
	}

	private shuffleRounds(): void {
		this.rounds = shuffle(ROUNDS);
	}

	private setupRound(): void {
		const r = this.round();
		const shuffled = shuffle([...r.group, r.intrus]);
		this.items.set(shuffled);
		this.intrusIndex.set(shuffled.indexOf(r.intrus));
	}

	private startRoundTimer(): void {
		this.timer.start(
			this.settings.roundTimeSec(),
			(secondsLeft) => this.remainingSec.set(secondsLeft),
			() => this.handleTimeout(),
		);
	}

	private handleTimeout(): void {
		if (this.locked()) return;
		this.verdict.set("timeout");
		this.locked.set(true);
		this.audio.play("timeout");
		this.audio.play("reveal", { volume: 0.6 });
		this.scheduleAutoNext();
	}

	/** Enchaine automatiquement apres le verdict pour garder le rythme (le bouton Suivant reste dispo pour zapper). */
	private scheduleAutoNext(): void {
		clearTimeout(this.autoNextTimer);
		this.autoNextTimer = setTimeout(() => this.next(), 3200);
	}

	square(name: string): string {
		return championSquareUrl(name);
	}

	splash(name: string): string {
		return championSplashUrl(name);
	}

	pick(i: number): void {
		if (this.locked()) return;
		this.timer.stop();
		const host = this.hostElement.nativeElement;
		const stage = host.querySelector(".cine-stage") as HTMLElement | null;
		this.pickedIndex.set(i);
		this.locked.set(true);
		const ok = i === this.intrusIndex();
		if (ok) {
			this.score.update((s) => s + 1);
			this.correctCount.update((c) => c + 1);
			this.verdict.set("correct");
			this.audio.play("correct");
			const card = host.querySelector(
				`.choice[data-index="${i}"]`,
			) as HTMLElement | null;
			burstParticles(stage, {
				colors: ["#3fd67a", "#e0a94a", "#f0e6d2"],
				count: 36,
			});
			floatScore(stage, `+${this.basePoints}`);
			if (card) pulse(card, 1.12);
		} else {
			this.verdict.set("wrong");
			this.audio.play("wrong");
			shake(stage);
		}
		this.audio.play("reveal", { volume: 0.6 });
		this.scheduleAutoNext();
	}

	next(): void {
		if (!this.locked()) return;
		clearTimeout(this.autoNextTimer);
		this.audio.play("swap", { volume: 0.7 });
		this.index.update((i) => i + 1);
		if (this.finished()) {
			this.timer.stop();
			this.submitMix();
			return;
		}
		this.pickedIndex.set(null);
		this.verdict.set(null);
		this.locked.set(false);
		this.setupRound();
		this.startRoundTimer();
	}

	submitMix(): void {
		if (this.submittedToMix()) return;
		this.submittedToMix.set(true);
		this.room.submitMixSegment(
			this.score() * this.basePoints,
			`Intrus : ${this.correctCount()}/${this.maxRounds()} intrus trouves.`,
		);
	}

	requestRestart(): void {
		if (!this.room.isHost()) return;
		this.room.restartGame("intrus");
	}

	restart(): void {
		this.shuffleRounds();
		clearTimeout(this.autoNextTimer);
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.correctCount.set(0);
		this.pickedIndex.set(null);
		this.verdict.set(null);
		this.locked.set(false);
		this.setupRound();
		this.startRoundTimer();
	}
}
