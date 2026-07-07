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
	{
		a: "Volibear",
		b: "Sion",
		name: "Volision",
		vibe: "Un ours électrique et un mort qui charge : personne n'a envie de tank ça en 1v1.",
	},
	{
		a: "Camille",
		b: "Fiora",
		name: "Camiora",
		vibe: "Ciseaux chirurgicaux d'un côté, ripostes chirurgicales de l'autre. Ta vitale est marquée d'avance.",
	},
	{
		a: "Illaoi",
		b: "Cho'Gath",
		name: "Illagath",
		vibe: "Des tentacules qui martèlent, un ventre qui grossit à chaque kill. Fuis, littéralement.",
	},
	{
		a: "Jayce",
		b: "Poppy",
		name: "Jayppy",
		vibe: "Un marteau qui devient canon, un marteau qui devient mur. Bonne chance pour engager.",
	},
	{
		a: "Gnar",
		b: "Gragas",
		name: "Gnaragas",
		vibe: "Rage en mini, rage en méga, et un tonneau qui envoie tout le monde valser.",
	},
	{
		a: "Renekton",
		b: "Nasus",
		name: "Renasus",
		vibe: "Deux frères, une seule obsession : qui stack le plus vite avant que ça tourne mal.",
	},
	{
		a: "Ornn",
		b: "Malphite",
		name: "Ornphite",
		vibe: "Le forgeron du Freljord shape une armure de pierre, littéralement.",
	},
	{
		a: "Kled",
		b: "Tahm Kench",
		name: "Kledench",
		vibe: "Un cow-boy sur sa monture, une grenouille qui t'avale tout cru. La ferme n'a jamais été aussi hostile.",
	},
	{
		a: "Urgot",
		b: "Skarner",
		name: "Urgoner",
		vibe: "Des pattes mécaniques et des pinces de cristal : l'exécution la plus lente et la plus cruelle du jeu.",
	},
	{
		a: "Singed",
		b: "Dr. Mundo",
		name: "Singundo",
		vibe: "Un nuage toxique qui traîne, une seringue qui soigne n'importe quoi. La science zaunite au pire de sa forme.",
	},
	{
		a: "Aurora",
		b: "Lissandra",
		name: "Aurandra",
		vibe: "Le froid du Freljord et une renarde spectrale : le kit CC le plus glacial de la faille.",
	},
	{
		a: "Warwick",
		b: "Rengar",
		name: "Warengar",
		vibe: "Deux prédateurs qui reniflent le sang à travers les brumes de guerre. Zéro échappatoire une fois repéré.",
	},
	{
		a: "Elise",
		b: "Zac",
		name: "Elisac",
		vibe: "Une araignée qui saute de forme, une gelée qui se divise. Le jungle bestiaire au complet.",
	},
	{
		a: "Nidalee",
		b: "Rek'Sai",
		name: "Nidasai",
		vibe: "Une lance qui traque de loin, un tunnel qui surgit de sous tes pieds. Nulle part où te cacher.",
	},
	{
		a: "Vi",
		b: "Jayce",
		name: "Viyce",
		vibe: "Des poings qui percent les murs, un marteau qui construit les siens. Piltover s'en remettra pas.",
	},
	{
		a: "Kindred",
		b: "Karthus",
		name: "Kindarthus",
		vibe: "La mort en duo, la mort en solo : de toute façon tu finis en requiem.",
	},
	{
		a: "Ivern",
		b: "Maokai",
		name: "Ivkai",
		vibe: "Un jardinier pacifiste, un arbre déchaîné. La forêt a deux humeurs très différentes.",
	},
	{
		a: "Nunu & Willump",
		b: "Trundle",
		name: "Nuntrundle",
		vibe: "Une boule de neige qui grossit, un pilier qui vole ta force. Le froid n'a jamais été aussi méchant.",
	},
	{
		a: "Diana",
		b: "Leona",
		name: "Dieona",
		vibe: "La lune et le soleil, ennemies jurées, fusionnées en un seul cauchemar d'éclipse totale.",
	},
	{
		a: "Zyra",
		b: "Bard",
		name: "Zyrard",
		vibe: "Des plantes carnivores et des chimes cosmiques : le support le plus imprévisible de la faille.",
	},
	{
		a: "Rakan",
		b: "Xayah",
		name: "Rakayah",
		vibe: "Un couple qui charme et qui plume, littéralement inséparable même fusionné.",
	},
	{
		a: "Renata Glasc",
		b: "Orianna",
		name: "Renatorianna",
		vibe: "Une chaîne qui retourne ton allié contre toi, une boule qui shield tout le monde sauf toi.",
	},
	{
		a: "Milio",
		b: "Janna",
		name: "Miljanna",
		vibe: "Chaleur réconfortante d'un côté, tornade qui te jette en l'air de l'autre. Support tout-terrain.",
	},
	{
		a: "Senna",
		b: "Lucian",
		name: "Sennacian",
		vibe: "Un couple maudit qui tire dans la brume ensemble, littéralement synchronisés depuis toujours.",
	},
	{
		a: "Varus",
		b: "Cassiopeia",
		name: "Varopeia",
		vibe: "Une flèche corrompue, un poison qui rampe. Le débuff empilé jusqu'à l'écœurement.",
	},
	{
		a: "Twitch",
		b: "Singed",
		name: "Twinged",
		vibe: "Un rat planqué dans le poison, un chimiste qui en balance partout. L'hygiène de la faille est douteuse.",
	},
	{
		a: "Ezreal",
		b: "Corki",
		name: "Ezorki",
		vibe: "Un explorateur qui esquive tout, un pilote qui largue des paquets. La botlane la plus mobile du jeu.",
	},
	{
		a: "Xerath",
		b: "Vel'Koz",
		name: "Xerkoz",
		vibe: "Deux lasers cosmiques qui se battent pour savoir qui poke le plus loin.",
	},
	{
		a: "Anivia",
		b: "Swain",
		name: "Anivain",
		vibe: "Un mur de glace qui bloque tout, une faucheuse d'âmes qui grandit avec le chaos. Freljord et Noxus en un seul cri.",
	},
	{
		a: "Twisted Fate",
		b: "Neeko",
		name: "Twisteeko",
		vibe: "Un tricheur de cartes, une caméléon qui se déguise en toi. Sais même plus qui tu affrontes.",
	},
	{
		a: "Ryze",
		b: "Taliyah",
		name: "Ryliyah",
		vibe: "Le lore le plus confus du jeu rencontre des murs de pierre. Bon courage pour comprendre la suite.",
	},
	{
		a: "Annie",
		b: "Amumu",
		name: "Annumu",
		vibe: "Un ours en peluche enflammé, une momie qui pleure. L'enfance la plus traumatisante de Runeterra.",
	},
	{
		a: "Heimerdinger",
		b: "Ziggs",
		name: "Heimggs",
		vibe: "Des tourelles qui spam, des bombes qui pleuvent. Ta base ressemble à un feu d'artifice raté.",
	},
	{
		a: "Zilean",
		b: "Bard",
		name: "Zilard",
		vibe: "Le temps qui rembobine, des portails qui téléportent : la logique de la faille s'effondre.",
	},
	{
		a: "Soraka",
		b: "Nami",
		name: "Sorami",
		vibe: "Un heal qui traverse la map, une vague qui claque le CC. Le duo support le plus increvable.",
	},
	{
		a: "Karma",
		b: "Taric",
		name: "Karic",
		vibe: "Un bouclier mantra, une invincibilité stellaire. Personne ne meurt sous cette garde.",
	},
	{
		a: "Alistar",
		b: "Leona",
		name: "Alistona",
		vibe: "Un headbutt-pulverize et un combo solaire : t'as même pas le temps de comprendre que t'es mort.",
	},
	{
		a: "Pantheon",
		b: "Galio",
		name: "Panthalio",
		vibe: "Une lance qui plane depuis les cieux, une gargouille qui atterrit sur ta tête. Demacia et le ciel s'allient contre toi.",
	},
	{
		a: "Quinn",
		b: "Kayle",
		name: "Quinkayle",
		vibe: "Un aigle éclaireur, une ange justicière ailée. Demacia envoie toute son aviation.",
	},
	{
		a: "Vladimir",
		b: "Aatrox",
		name: "Vladrox",
		vibe: "Deux vampires increvables qui se soignent plus vite que tu ne peux les taper.",
	},
	{
		a: "Fiddlesticks",
		b: "Shaco",
		name: "Fiddaco",
		vibe: "Un épouvantail qui fait peur pour de vrai, un clown qui rit dans ton dos. Cauchemar de jungle garanti.",
	},
	{
		a: "Brand",
		b: "Xerath",
		name: "Branath",
		vibe: "Une flamme qui propage les stuns, un laser qui poke à l'infini. Team fight explosive assurée.",
	},
	{
		a: "Syndra",
		b: "Orianna",
		name: "Syndriana",
		vibe: "Des sphères qui claquent, une boule qui shield puis explose. Deux mages, un seul style : tout péter d'un coup.",
	},
	{
		a: "LeBlanc",
		b: "Neeko",
		name: "LeNeeko",
		vibe: "Deux clones, un seul mensonge : tu ne sais jamais laquelle est la vraie avant qu'il soit trop tard.",
	},
	{
		a: "Viktor",
		b: "Zac",
		name: "Viktac",
		vibe: "L'évolution glorieuse rencontre une gelée toxique. Zaun en fusion, littéralement.",
	},
	{
		a: "Akali",
		b: "Talon",
		name: "Akalon",
		vibe: "Deux assassins qui disparaissent dans l'ombre, et une seule règle : tu meurs avant de les voir venir.",
	},
	{
		a: "Qiyana",
		b: "Taliyah",
		name: "Qiyaliyah",
		vibe: "Deux manieuses de pierre qui redessinent la carte à leur avantage. Ta ligne de vue n'existe plus.",
	},
	{
		a: "Zoe",
		b: "Lulu",
		name: "Zoelu",
		vibe: "Une bulle qui endort, une baguette qui transforme en poro géant. Le CC le plus mignon et le plus injuste.",
	},
	{
		a: "Veigar",
		b: "Malzahar",
		name: "Veigahar",
		vibe: "Une cage stackée, une suppression garantie. Le mage qui t'enferme a un cousin qui t'efface carrément.",
	},
	{
		a: "Kassadin",
		b: "Ekko",
		name: "Kassekko",
		vibe: "Deux voyageurs temporels du Néant qui se téléportent plus vite que ton estimation de dégâts.",
	},
	{
		a: "Aphelios",
		b: "Kai'Sa",
		name: "Aphesa",
		vibe: "Cinq armes qu'il faut apprendre par cœur, une évolution qui casse toutes les règles. Bon courage botlane.",
	},
	{
		a: "Miss Fortune",
		b: "Caitlyn",
		name: "Missdillyn",
		vibe: "Une pluie de balles, un piège qui claque de loin. Deux flingueuses de Piltover pour le prix d'une.",
	},
	{
		a: "Jhin",
		b: "Ashe",
		name: "Jhinshe",
		vibe: "Quatre balles théâtrales, une flèche qui gèle. L'exécution la plus stylée et la plus glaciale.",
	},
	{
		a: "Kog'Maw",
		b: "Cho'Gath",
		name: "Kogath",
		vibe: "Deux bouches du Néant qui grandissent en mangeant tout ce qui bouge. Ta base n'est qu'un buffet.",
	},
	{
		a: "Xin Zhao",
		b: "Jarvan IV",
		name: "Xin Jarvan",
		vibe: "Une lance qui stun, un mur qui enferme. Demacia ne te laisse littéralement aucune sortie.",
	},
	{
		a: "Olaf",
		b: "Tryndamere",
		name: "Olamere",
		vibe: "Plus t'es bas en vie, plus il tape fort. Les deux. En même temps. Zéro chill.",
	},
	{
		a: "Yorick",
		b: "Mordekaiser",
		name: "Yordekaiser",
		vibe: "Une armée de goules, un royaume des ombres. Mourir contre eux, c'est juste le début de tes ennuis.",
	},
	{
		a: "Rell",
		b: "Poppy",
		name: "Relpoppy",
		vibe: "Un cheval mécanique qui s'écrase du ciel, un marteau qui stoppe tous les dashs. Engage brutal garanti.",
	},
	{
		a: "Braum",
		b: "Alistar",
		name: "Braumstar",
		vibe: "Un bouclier increvable, un headbutt qui envoie dans le décor. Botlane, prépare tes condoléances.",
	},
	{
		a: "Nautilus",
		b: "Skarner",
		name: "Nautkarner",
		vibe: "Une ancre qui traque, des pinces de cristal qui traînent. Le CC le plus long et le plus injuste de la faille.",
	},
	{
		a: "Pyke",
		b: "Vladimir",
		name: "Pykladimir",
		vibe: "Un support qui exécute sous 50%, un vampire qui remonte sa vie en un clic. Ironie totale.",
	},
	{
		a: "Rumble",
		b: "Gnar",
		name: "Rumnar",
		vibe: "Une surchauffe qui punit tout le monde, une rage méga qui écrase tout. Deux mécas incontrôlables.",
	},
	{
		a: "Shyvana",
		b: "Aurelion Sol",
		name: "Shyvasol",
		vibe: "Une demi-dragonne locale, un dieu-dragon cosmique. La faille version kaiju.",
	},
	{
		a: "Wukong",
		b: "Jarvan IV",
		name: "Wujarvan",
		vibe: "Un clone qui trompe, un drapeau qui enferme. Sortir de ce combo relève du miracle.",
	},
	{
		a: "Sylas",
		b: "Ryze",
		name: "Sylryze",
		vibe: "Un voleur d'ultime, un sorcier increvable au lore réécrit chaque patch. Riot Games en sueur.",
	},
	{
		a: "Zac",
		b: "Sion",
		name: "Zacion",
		vibe: "Une gelée qui rebondit après sa mort, un mort-vivant qui charge après la sienne. Ils refusent juste de mourir.",
	},
	{
		a: "Nilah",
		b: "Yone",
		name: "Nilone",
		vibe: "Un fouet joyeux increvable, une âme jumelle vengeresse. Deux dashs, aucune pitié.",
	},
	{
		a: "K'Sante",
		b: "Sett",
		name: "K'Sett",
		vibe: "Un tank qui devient colosse, des poings qui claquent au sol. Le top lane le plus étouffant du game.",
	},
	{
		a: "Briar",
		b: "Vi",
		name: "Briavi",
		vibe: "Une frénésie sanguinaire incontrôlable, des poings qui percent les murs. Zaun perd patience.",
	},
	{
		a: "Hwei",
		b: "Neeko",
		name: "Hweeko",
		vibe: "Un peintre qui matérialise ses émotions, une caméléon qui imite les tiennes. Personne sait ce qui est réel.",
	},
	{
		a: "Smolder",
		b: "Shyvana",
		name: "Smolvana",
		vibe: "Un bébé dragon qui grandit à chaque kill, une demi-dragonne qui rugit déjà à fond. La relève est assurée.",
	},
	{
		a: "Naafiri",
		b: "Rengar",
		name: "Naafingar",
		vibe: "Une meute qui déboule de nulle part, un chasseur invisible en embuscade. La jungle devient une meute de cauchemars.",
	},
	{
		a: "Bel'Veth",
		b: "Cho'Gath",
		name: "Belgath",
		vibe: "Une impératrice du Néant increvable, une bouche qui grossit à l'infini. Le Néant a gagné la game d'avance.",
	},
	{
		a: "Zeri",
		b: "Ezreal",
		name: "Zerael",
		vibe: "Deux ADC increvables qui zigzaguent partout. Bonne chance pour juste les toucher une fois.",
	},
	{
		a: "Ambessa",
		b: "Sett",
		name: "Ambett",
		vibe: "Une générale noxienne implacable, un boss de bar increvable. Le top lane devient un ring de MMA.",
	},
	{
		a: "Mel",
		b: "Renata Glasc",
		name: "Melata",
		vibe: "Une héritière qui réfléchit tes propres sorts, une chimiste qui retourne tes alliés. Piltover te manipule des deux côtés.",
	},
	{
		a: "Taric",
		b: "Nautilus",
		name: "Taritilus",
		vibe: "Un gardien stellaire increvable, une ancre qui traque de loin. Bon courage pour juste t'approcher.",
	},
	{
		a: "Lillia",
		b: "Ivern",
		name: "Lillern",
		vibe: "Un faon endormeur, un jardinier pacifiste. La jungle la plus zen et la plus soporifique de la faille.",
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
