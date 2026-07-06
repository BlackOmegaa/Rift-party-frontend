import {
	ChangeDetectionStrategy,
	Component,
	computed,
	effect,
	ElementRef,
	inject,
	signal,
} from "@angular/core";
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { championSquareUrl } from "../../shared/lol-assets";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { RoundTimer } from "../../shared/round-timer";
import { animateEndScreen } from "../../shared/end-screen-animate";

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
export class IntrusComponent {
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
	protected readonly timer = new RoundTimer();
	protected remainingSec = signal(0);

	round = computed(() => this.rounds[this.index() % this.rounds.length]);
	roundNumber = computed(() => this.index() + 1);
	finished = computed(() => this.index() >= this.maxRounds());
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
	) {
		this.shuffleRounds();
		this.setupRound();
		this.startRoundTimer();
		this.room.onGameRestarted((payload) => {
			if (payload.gameId === "intrus") this.restart();
		});
		effect(() => {
			if (this.finished()) animateEndScreen(this.hostElement.nativeElement);
		});
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
		this.locked.set(true);
	}

	square(name: string): string {
		return championSquareUrl(name);
	}

	pick(i: number): void {
		if (this.locked()) return;
		this.timer.stop();
		this.pickedIndex.set(i);
		this.locked.set(true);
		if (i === this.intrusIndex()) {
			this.score.update((s) => s + 1);
			this.correctCount.update((c) => c + 1);
		}
	}

	next(): void {
		if (!this.locked()) return;
		this.index.update((i) => i + 1);
		if (this.finished()) {
			this.timer.stop();
			this.submitMix();
			return;
		}
		this.pickedIndex.set(null);
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
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.correctCount.set(0);
		this.pickedIndex.set(null);
		this.locked.set(false);
		this.setupRound();
		this.startRoundTimer();
	}
}
