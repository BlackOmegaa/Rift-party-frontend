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
import { SocketService } from "../../core/services/socket.service";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { championSquareUrl } from "../../shared/lol-assets";
import { RoundTimer } from "../../shared/round-timer";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { AudioService } from "../../core/services/audio.service";
import { animateEndScreen } from "../../shared/end-screen-animate";
import {
	burstParticles,
	pulse,
	punchIn,
	slideUp,
} from "../../shared/cinematic/cinematic";
import { gsap } from "gsap";

interface RankingRound {
	question: string;
	options: string[];
	premium?: boolean;
}

/** Bornes des tiers cinematiques (slot 1 = meilleur classement). */
type TierId = "S" | "A" | "B" | "C";
const TIER_BOUNDS: { id: TierId; slots: number[] }[] = [
	{ id: "S", slots: [1, 2] },
	{ id: "A", slots: [3, 4, 5] },
	{ id: "B", slots: [6, 7, 8] },
	{ id: "C", slots: [9, 10] },
];

const ROUNDS: RankingRound[] = [
	{
		question: "Qui a le plus d’aura ?",
		options: [
			"Wukong",
			"Yasuo",
			"Jhin",
			"Mordekaiser",
			"Aatrox",
			"Viego",
			"Yone",
			"Thresh",
			"Zed",
			"Pantheon",
		],
		premium: false,
	},
	{
		question: "Qui est le plus chad ?",
		options: [
			"Braum",
			"Pantheon",
			"Mordekaiser",
			"Aatrox",
			"Darius",
			"Ornn",
			"Swain",
			"Jarvan IV",
			"K'Sante",
			"Sett",
		],
		premium: true,
	},
	{
		question: "Je mets le paf à qui en premier ?",
		options: [
			"Shaco",
			"Twitch",
			"Draven",
			"Yasuo",
			"Tryndamere",
			"Fizz",
			"Singed",
			"Katarina",
			"Teemo",
			"Yuumi",
		],
		premium: true,
	},
	{
		question: "Qui mérite un report ?",
		options: [
			"Master Yi",
			"Vayne",
			"Katarina",
			"Zed",
			"Lee Sin",
			"Shaco",
			"Tryndamere",
			"Yasuo",
			"Draven",
			"Riven",
		],
		premium: true,
	},
	{
		question: "Qui est le plus gros puant ?",
		options: [
			"Teemo",
			"Twitch",
			"Kled",
			"Zac",
			"Gragas",
			"Jinx",
			"Yuumi",
			"Singed",
			"Shaco",
			"Draven",
		],
		premium: true,
	},
	{
		question: "Qui est le plus gros red flag ?",
		options: [
			"Kayn",
			"Qiyana",
			"Yone",
			"Akali",
			"LeBlanc",
			"Evelynn",
			"Draven",
			"Viego",
			"Jhin",
			"Sylas",
		],
		premium: true,
	},
	{
		question: "Je lui confie mon enfant (top 1 = oui) ?",
		options: [
			"Jarvan IV",
			"Ashe",
			"Orianna",
			"Braum",
			"Ornn",
			"Shen",
			"Janna",
			"Nami",
			"Galio",
			"Sejuani",
		],
		premium: true,
	},
	{
		question: "Qui te sort “tkt je scale” à 0/7 ?",
		options: [
			"Aurelion Sol",
			"Kayle",
			"Nasus",
			"Veigar",
			"Vayne",
			"Kassadin",
			"Yasuo",
			"Yone",
			"Master Yi",
			"Smolder",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de flow ?",
		options: [
			"Mordekaiser",
			"Aurelion Sol",
			"Bel'Veth",
			"Viego",
			"Swain",
			"Thresh",
			"Xerath",
			"Cho'Gath",
			"Ornn",
			"Aatrox",
		],
		premium: true,
	},
	{
		question: "Qui a la plus grosse énergie “je carrye” ?",
		options: [
			"Riven",
			"Irelia",
			"Akali",
			"Zed",
			"Viego",
			"Ekko",
			"Kai'Sa",
			"Jinx",
			"Yasuo",
			"Yone",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de rizz ?",
		options: [
			"Akali",
			"Rakan",
			"Sylas",
			"Yone",
			"Qiyana",
			"Kayn",
			"Draven",
			"Sett",
			"Ahri",
			"Evelynn",
		],
		premium: true,
	},
	{
		question: "Qui ferait le plus genant ?",
		options: [
			"Jinx",
			"Kled",
			"Gragas",
			"Yuumi",
			"Rammus",
			"Draven",
			"Yasuo",
			"Teemo",
			"Shaco",
			"Twitch",
		],
		premium: true,
	},
	{
		question: "Qui sent le plus le duoQ insupportable ?",
		options: [
			"Draven",
			"Nami",
			"Lucian",
			"Milio",
			"Yuumi",
			"Twitch",
			"Lulu",
			"Kog'Maw",
			"Master Yi",
			"Taric",
		],
		premium: true,
	},
	{
		question: "Qui est le plus “il parle beaucoup mais carry jamais” ?",
		options: [
			"Pyke",
			"Riven",
			"Viego",
			"Ezreal",
			"Yasuo",
			"Draven",
			"Teemo",
			"Shaco",
			"Lux",
			"Jhin",
		],
		premium: true,
	},
	{
		question: "Qui est le plus probable de steal ton pentakill ?",
		options: [
			"Miss Fortune",
			"Ziggs",
			"Lux",
			"Ezreal",
			"Jinx",
			"Jhin",
			"Karthus",
			"Pyke",
			"Draven",
			"Katarina",
		],
		premium: true,
	},
	{
		question: "Qui a le plus d’aura ?",
		options: [
			"Wukong",
			"Yasuo",
			"Jhin",
			"Mordekaiser",
			"Aatrox",
			"Viego",
			"Yone",
			"Thresh",
			"Zed",
			"Pantheon",
		],
		premium: true,
	},
	{
		question: "Qui est le plus chad ?",
		options: [
			"Braum",
			"Pantheon",
			"Mordekaiser",
			"Aatrox",
			"Darius",
			"Ornn",
			"Swain",
			"Jarvan IV",
			"K'Sante",
			"Sett",
		],
		premium: true,
	},
	{
		question: "Je mets le paf ? (edition mixte)",
		options: [
			"Shaco",
			"Twitch",
			"Draven",
			"Yasuo",
			"Tryndamere",
			"Fizz",
			"Singed",
			"Katarina",
			"Teemo",
			"Yuumi",
		],
		premium: true,
	},
	{
		question: "Qui mérite un report même avant la game ?",
		options: [
			"Master Yi",
			"Vayne",
			"Katarina",
			"Zed",
			"Lee Sin",
			"Shaco",
			"Tryndamere",
			"Yasuo",
			"Draven",
			"Riven",
		],
		premium: true,
	},
	{
		question: "Qui est le plus gros puant ?",
		options: [
			"Teemo",
			"Twitch",
			"Kled",
			"Zac",
			"Gragas",
			"Jinx",
			"Yuumi",
			"Singed",
			"Shaco",
			"Draven",
		],
		premium: true,
	},
	{
		question: "Qui est le plus gros red flag ?",
		options: [
			"Kayn",
			"Qiyana",
			"Yone",
			"Akali",
			"LeBlanc",
			"Evelynn",
			"Draven",
			"Viego",
			"Jhin",
			"Sylas",
		],
		premium: true,
	},
	{
		question: "Qui te sort “tkt je scale” en 0/7 ?",
		options: [
			"Aurelion Sol",
			"Kayle",
			"Nasus",
			"Veigar",
			"Vayne",
			"Kassadin",
			"Yasuo",
			"Yone",
			"Master Yi",
			"Smolder",
		],
		premium: true,
	},
	{
		question: "Qui fait le meilleur date ?",
		options: [
			"Evelynn",
			"Draven",
			"Viego",
			"Jhin",
			"Sylas",
			"Kayn",
			"Qiyana",
			"Yone",
			"Akali",
			"LeBlanc",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de vibes boss final ?",
		options: [
			"Mordekaiser",
			"Aurelion Sol",
			"Bel'Veth",
			"Viego",
			"Swain",
			"Thresh",
			"Xerath",
			"Cho'Gath",
			"Ornn",
			"Aatrox",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de rizz ?",
		options: [
			"Akali",
			"Rakan",
			"Sylas",
			"Yone",
			"Qiyana",
			"Kayn",
			"Draven",
			"Sett",
			"Ahri",
			"Evelynn",
		],
		premium: true,
	},
	{
		question: "Qui sent le plus le duoQ insupportable ?",
		options: [
			"Draven",
			"Nami",
			"Lucian",
			"Milio",
			"Yuumi",
			"Twitch",
			"Lulu",
			"Kog'Maw",
			"Master Yi",
			"Taric",
		],
		premium: true,
	},
	{
		question: "Qui est le plus “il parle beaucoup mais carry jamais” ?",
		options: [
			"Pyke",
			"Riven",
			"Viego",
			"Ezreal",
			"Yasuo",
			"Draven",
			"Teemo",
			"Shaco",
			"Lux",
			"Jhin",
		],
		premium: true,
	},
	{
		question: "Qui est le plus probable de steal ton pentakill ?",
		options: [
			"Miss Fortune",
			"Ziggs",
			"Lux",
			"Ezreal",
			"Jinx",
			"Jhin",
			"Karthus",
			"Pyke",
			"Draven",
			"Katarina",
		],
		premium: true,
	},
	{
		question: "Qui a le plus d’aura ?",
		options: [
			"Wukong",
			"Yasuo",
			"Jhin",
			"Mordekaiser",
			"Aatrox",
			"Viego",
			"Yone",
			"Thresh",
			"Zed",
			"Pantheon",
		],
		premium: true,
	},
	{
		question: "Qui est le plus chad ?",
		options: [
			"Braum",
			"Pantheon",
			"Mordekaiser",
			"Aatrox",
			"Darius",
			"Ornn",
			"Swain",
			"Jarvan IV",
			"K'Sante",
			"Sett",
		],
		premium: true,
	},
	{
		question: "Je mets le paf ? (édition femme)",
		options: [
			"Ahri",
			"Kai'Sa",
			"Miss Fortune",
			"Evelynn",
			"LeBlanc",
			"Akali",
			"Irelia",
			"Samira",
			"Nidalee",
			"Qiyana",
		],
		premium: true,
	},
	{
		question: "Qui peut t'insulter avant même avant la game ?",
		options: [
			"Master Yi",
			"Vayne",
			"Katarina",
			"Zed",
			"Lee Sin",
			"Shaco",
			"Tryndamere",
			"Yasuo",
			"Draven",
			"Riven",
		],
		premium: true,
	},
	{
		question: "Qui est le plus gros crasseux ?",
		options: [
			"Teemo",
			"Twitch",
			"Kled",
			"Zac",
			"Gragas",
			"Jinx",
			"Yuumi",
			"Singed",
			"Shaco",
			"Draven",
		],
		premium: true,
	},

	{
		question: "Je mets le paf ? (édition homme)",
		options: [
			"Sett",
			"Yasuo",
			"Aphelios",
			"Viego",
			"Sylas",
			"Pantheon",
			"Braum",
			"Ezreal",
			"Yone",
			"Taric",
		],
		premium: true,
	},
	{
		question: "Je mets le paf ? (édition WTF)",
		options: [
			"Blue Buff",
			"Baron Nashor",
			"Gromp",
			"Scuttle Crab",
			"Red Buff",
			"Dragon",
			"Rift Herald",
			"Krug",
			"Raptor",
			"Ancient Poro",
		],
		premium: true,
	},
	{
		question: "Je mets le paf ? (édition funeste)",
		options: [
			"Blue Buff",
			"Bard",
			"Tahm Kench",
			"Cho'Gath",
			"Baron Nashor",
			"Rammus",
			"Gragas",
			"Kog'Maw",
			"Gromp",
			"Maokai",
		],
		premium: true,
	},
	{
		question: "Qui est le plus gros red flag ?",
		options: [
			"Kayn",
			"Qiyana",
			"Yone",
			"Akali",
			"LeBlanc",
			"Evelynn",
			"Draven",
			"Viego",
			"Jhin",
			"Sylas",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de main character energy ?",
		options: [
			"Viego",
			"Ekko",
			"Kai'Sa",
			"Jinx",
			"Yasuo",
			"Yone",
			"Riven",
			"Irelia",
			"Akali",
			"Zed",
		],
		premium: true,
	},
	{
		question: "Qui te sort “tkt je scale” à 0/7 ?",
		options: [
			"Aurelion Sol",
			"Kayle",
			"Nasus",
			"Veigar",
			"Vayne",
			"Kassadin",
			"Yasuo",
			"Yone",
			"Master Yi",
			"Smolder",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de vibes boss final ?",
		options: [
			"Mordekaiser",
			"Aurelion Sol",
			"Bel'Veth",
			"Viego",
			"Swain",
			"Thresh",
			"Xerath",
			"Cho'Gath",
			"Ornn",
			"Aatrox",
		],
		premium: true,
	},
	{
		question: "Qui a la plus grosse énergie “je carry ou je dodge” ?",
		options: [
			"Riven",
			"Irelia",
			"Akali",
			"Zed",
			"Viego",
			"Ekko",
			"Kai'Sa",
			"Jinx",
			"Yasuo",
			"Yone",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de rizz ?",
		options: [
			"Akali",
			"Rakan",
			"Sylas",
			"Yone",
			"Qiyana",
			"Kayn",
			"Draven",
			"Sett",
			"Ahri",
			"Evelynn",
		],
		premium: true,
	},
	{
		question: "Qui sent le plus le duoQ insupportable ?",
		options: [
			"Draven",
			"Nami",
			"Lucian",
			"Milio",
			"Yuumi",
			"Twitch",
			"Lulu",
			"Kog'Maw",
			"Master Yi",
			"Taric",
		],
		premium: true,
	},
	{
		question: "Qui est le plus “il parle beaucoup mais carry jamais” ?",
		options: [
			"Pyke",
			"Riven",
			"Viego",
			"Ezreal",
			"Yasuo",
			"Draven",
			"Teemo",
			"Shaco",
			"Lux",
			"Jhin",
		],
		premium: true,
	},
	{
		question: "Qui est le plus probable de steal ton pentakill ?",
		options: [
			"Miss Fortune",
			"Ziggs",
			"Lux",
			"Ezreal",
			"Jinx",
			"Jhin",
			"Karthus",
			"Pyke",
			"Draven",
			"Katarina",
		],
		premium: true,
	},

	{
		question: "Qui a le plus d’aura ? #4",
		options: [
			"Wukong",
			"Yasuo",
			"Jhin",
			"Mordekaiser",
			"Aatrox",
			"Viego",
			"Yone",
			"Thresh",
			"Zed",
			"Pantheon",
		],
		premium: true,
	},
	{
		question: "Qui est le plus chad ?",
		options: [
			"Braum",
			"Pantheon",
			"Mordekaiser",
			"Aatrox",
			"Darius",
			"Ornn",
			"Swain",
			"Jarvan IV",
			"K'Sante",
			"Sett",
		],
		premium: true,
	},
	{
		question: "Je mets le paf ?",
		options: [
			"Shaco",
			"Twitch",
			"Draven",
			"Yasuo",
			"Tryndamere",
			"Fizz",
			"Singed",
			"Katarina",
			"Teemo",
			"Yuumi",
		],
		premium: true,
	},
	{
		question: "Qui mérite un report même avant la game ? ",
		options: [
			"Master Yi",
			"Vayne",
			"Katarina",
			"Zed",
			"Lee Sin",
			"Shaco",
			"Tryndamere",
			"Yasuo",
			"Draven",
			"Riven",
		],
		premium: true,
	},
	{
		question: "Qui ferait le pire coloc ?",
		options: [
			"Teemo",
			"Twitch",
			"Kled",
			"Zac",
			"Gragas",
			"Jinx",
			"Yuumi",
			"Singed",
			"Shaco",
			"Draven",
		],
		premium: true,
	},
	{
		question: "Qui est le plus gros red flag ?",
		options: [
			"Kayn",
			"Qiyana",
			"Yone",
			"Akali",
			"LeBlanc",
			"Evelynn",
			"Draven",
			"Viego",
			"Jhin",
			"Sylas",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de main character energy ?",
		options: [
			"Viego",
			"Ekko",
			"Kai'Sa",
			"Jinx",
			"Yasuo",
			"Yone",
			"Riven",
			"Irelia",
			"Akali",
			"Zed",
		],
		premium: true,
	},
	{
		question: "Je lui confie mon gosse ?",
		options: [
			"Jarvan IV",
			"Ashe",
			"Orianna",
			"Braum",
			"Ornn",
			"Shen",
			"Janna",
			"Nami",
			"Galio",
			"Sejuani",
		],
		premium: true,
	},
	{
		question: "Qui te sort “tkt je scale” à 0/7 ? #4",
		options: [
			"Aurelion Sol",
			"Kayle",
			"Nasus",
			"Veigar",
			"Vayne",
			"Kassadin",
			"Yasuo",
			"Yone",
			"Master Yi",
			"Smolder",
		],
		premium: true,
	},
	{
		question: "Qui a la plus grosse énergie “je carry ou je dodge” ?",
		options: [
			"Riven",
			"Irelia",
			"Akali",
			"Zed",
			"Viego",
			"Ekko",
			"Kai'Sa",
			"Jinx",
			"Yasuo",
			"Yone",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de rizz ?",
		options: [
			"Akali",
			"Rakan",
			"Sylas",
			"Yone",
			"Qiyana",
			"Kayn",
			"Draven",
			"Sett",
			"Ahri",
			"Evelynn",
		],
		premium: true,
	},

	{
		question: "Qui sent le plus le duoQ insupportable ?",
		options: [
			"Draven",
			"Nami",
			"Lucian",
			"Milio",
			"Yuumi",
			"Twitch",
			"Lulu",
			"Kog'Maw",
			"Master Yi",
			"Taric",
		],
		premium: true,
	},
	{
		question: "Qui est le plus “il parle beaucoup mais carry jamais” ?",
		options: [
			"Pyke",
			"Riven",
			"Viego",
			"Ezreal",
			"Yasuo",
			"Draven",
			"Teemo",
			"Shaco",
			"Lux",
			"Jhin",
		],
		premium: true,
	},
	{
		question: "Qui est le plus probable de steal ton pentakill ?",
		options: [
			"Miss Fortune",
			"Ziggs",
			"Lux",
			"Ezreal",
			"Jinx",
			"Jhin",
			"Karthus",
			"Pyke",
			"Draven",
			"Katarina",
		],
		premium: true,
	},
	{
		question: "Qui est l'OTP le plus instable ?",
		options: [
			"Katarina",
			"Jinx",
			"Shaco",
			"Draven",
			"Kled",
			"Briar",
			"Viego",
			"Renata Glasc",
			"Twitch",
			"Singed",
		],
		premium: true,
	},
	{
		question: "Quel OTP int le plus ?",
		options: [
			"Yasuo",
			"Draven",
			"Riven",
			"Lee Sin",
			"Katarina",
			"Vayne",
			"Shaco",
			"Yone",
			"Master Yi",
			"Teemo",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus giga chad ?",
		options: [
			"Braum",
			"Pantheon",
			"Sett",
			"Ornn",
			"Taric",
			"Sion",
			"Aatrox",
			"Mordekaiser",
			"Udyr",
			"Gragas",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus toxique ?",
		options: [
			"Draven",
			"Yasuo",
			"Shaco",
			"Riven",
			"Vayne",
			"Katarina",
			"Lee Sin",
			"Master Yi",
			"Zed",
			"Twitch",
		],
		premium: true,
	},

	{
		question: "Quel OTP a le plus d'ego ?",
		options: [
			"Draven",
			"Riven",
			"Yasuo",
			"Lee Sin",
			"Vayne",
			"Zed",
			"Katarina",
			"Qiyana",
			"Aphelios",
			"Gangplank",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus susceptible de dire 'ez' ?",
		options: [
			"Draven",
			"Shaco",
			"Yasuo",
			"Master Yi",
			"Twitch",
			"Riven",
			"Zed",
			"Vayne",
			"Katarina",
			"Darius",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus susceptible de casser son clavier ?",
		options: [
			"Draven",
			"Yasuo",
			"Riven",
			"Lee Sin",
			"Vayne",
			"Katarina",
			"Kalista",
			"Azir",
			"Gangplank",
			"Aphelios",
		],
		premium: true,
	},

	{
		question:
			"Quel OTP est le plus susceptible de se prendre pour le main character ?",
		options: [
			"Yasuo",
			"Yone",
			"Viego",
			"Riven",
			"Draven",
			"Katarina",
			"Zed",
			"Aphelios",
			"Qiyana",
			"Lee Sin",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus drôle ?",
		options: [
			"Bard",
			"Gragas",
			"Teemo",
			"Singed",
			"Shaco",
			"Nunu & Willump",
			"Tahm Kench",
			"Blitzcrank",
			"Braum",
			"Rammus",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus chill ?",
		options: [
			"Braum",
			"Bard",
			"Ivern",
			"Ornn",
			"Nami",
			"Soraka",
			"Maokai",
			"Rammus",
			"Taric",
			"Zilean",
		],
		premium: true,
	},
	{
		question: "Quel OTP est le plus BG IRL ?",
		options: [
			"Sett",
			"Yasuo",
			"Yone",
			"Sylas",
			"Aphelios",
			"Ezreal",
			"Pantheon",
			"Taric",
			"Viego",
			"Rakan",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus laid IRL ?",
		options: [
			"Teemo",
			"Shaco",
			"Singed",
			"Kog'Maw",
			"Gragas",
			"Cho'Gath",
			"Tahm Kench",
			"Urgot",
			"Twitch",
			"Mundo",
		],
		premium: true,
	},

	{
		question: "Quel OTP a le moins de QI ?",
		options: [
			"Master Yi",
			"Tryndamere",
			"Garen",
			"Yuumi",
			"Mundo",
			"Teemo",
			"Sion",
			"Olaf",
			"Trundle",
			"Nasus",
		],
		premium: true,
	},

	{
		question: "Quel OTP sent le plus mauvais IRL ?",
		options: [
			"Shaco",
			"Singed",
			"Draven",
			"Teemo",
			"Twitch",
			"Karthus",
			"Urgot",
			"Gragas",
			"Mundo",
			"Cho'Gath",
		],
		premium: true,
	},

	{
		question: "Quel OTP touche le moins d'herbe ?",
		options: [
			"Yasuo",
			"Riven",
			"Draven",
			"Katarina",
			"Lee Sin",
			"Vayne",
			"Zed",
			"Shaco",
			"Aphelios",
			"Kalista",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus susceptible d'être permaban ?",
		options: [
			"Draven",
			"Shaco",
			"Yasuo",
			"Riven",
			"Katarina",
			"Vayne",
			"Lee Sin",
			"Twitch",
			"Master Yi",
			"Zed",
		],
		premium: true,
	},

	{
		question: "Quel OTP a le setup le plus sale ?",
		options: [
			"Teemo",
			"Shaco",
			"Draven",
			"Singed",
			"Yasuo",
			"Master Yi",
			"Twitch",
			"Karthus",
			"Gragas",
			"Mundo",
		],
		premium: true,
	},

	{
		question: "Quel OTP est le plus susceptible de vivre chez ses parents ?",
		options: [
			"Yasuo",
			"Teemo",
			"Master Yi",
			"Draven",
			"Shaco",
			"Katarina",
			"Riven",
			"Twitch",
			"Zed",
			"Vayne",
		],
		premium: true,
	},

	{
		question:
			"Quel OTP est le plus susceptible de dire 'c'est la faute du jungler' ?",
		options: [
			"Yasuo",
			"Draven",
			"Riven",
			"Toplaner",
			"Vayne",
			"Katarina",
			"Zed",
			"Lee Sin",
			"Gangplank",
			"Irelia",
		],
		premium: true,
	},

	{
		question:
			"Quel OTP est le plus susceptible d'écrire un pavé après la game ?",
		options: [
			"Draven",
			"Riven",
			"Yasuo",
			"Shaco",
			"Katarina",
			"Gangplank",
			"Vayne",
			"Zed",
			"Lee Sin",
			"Aphelios",
		],
		premium: true,
	},
	{
		question: "Qui gagnerait un concours de skibidi sur la Rift ?",
		options: [
			"Qiyana",
			"Akali",
			"Jinx",
			"Samira",
			"Ekko",
			"Zeri",
			"Rakan",
			"Neeko",
			"K'Sante",
			"Yone",
		],
		premium: false,
	},
	{
		question: "Qui a le lore le plus tragique de la ligue ?",
		options: [
			"Viego",
			"Aatrox",
			"Yone",
			"Kalista",
			"Sylas",
			"Riven",
			"Karthus",
			"Vladimir",
			"Miss Fortune",
			"Jhin",
		],
		premium: false,
	},
	{
		question: "Qui ferait le pire prof principal ?",
		options: [
			"Renekton",
			"Darius",
			"Nasus",
			"Swain",
			"Vex",
			"Zilean",
			"Fiddlesticks",
			"Singed",
			"Cassiopeia",
			"Elise",
		],
		premium: false,
	},
	{
		question: "Qui serait le plus cringe en soirée ?",
		options: [
			"Teemo",
			"Ziggs",
			"Heimerdinger",
			"Tristana",
			"Poppy",
			"Rumble",
			"Corki",
			"Gnar",
			"Kled",
			"Yuumi",
		],
		premium: false,
	},
	{
		question: "Qui ferait le plus gros clutch en overtime ?",
		options: [
			"Zed",
			"Yasuo",
			"Katarina",
			"Fizz",
			"Kayn",
			"Akshan",
			"Qiyana",
			"Talon",
			"Rengar",
			"Kha'Zix",
		],
		premium: false,
	},
	{
		question: "Qui ferait le plus de vues en cassant tout sur TikTok Live ?",
		options: [
			"Evelynn",
			"Ahri",
			"LeBlanc",
			"Samira",
			"Kai'Sa",
			"Miss Fortune",
			"Sivir",
			"Irelia",
			"Qiyana",
			"Nidalee",
		],
		premium: true,
	},
	{
		question: "Qui serait le meilleur streamer Twitch ?",
		options: [
			"Draven",
			"Jinx",
			"Yasuo",
			"Katarina",
			"Vex",
			"Zoe",
			"Ziggs",
			"Tristana",
			"Ekko",
			"Fizz",
		],
		premium: false,
	},
	{
		question: "Qui te ghost après un date ?",
		options: [
			"Ezreal",
			"Kayn",
			"Talon",
			"Rengar",
			"Twisted Fate",
			"Graves",
			"Jhin",
			"Sylas",
			"Aphelios",
			"Zed",
		],
		premium: true,
	},
	{
		question: "Qui a la meilleure garde-robe ?",
		options: [
			"Ahri",
			"Ezreal",
			"Evelynn",
			"Camille",
			"Vayne",
			"Aphelios",
			"Sivir",
			"Rakan",
			"Xayah",
			"Qiyana",
		],
		premium: false,
	},
	{
		question: "Qui serait le pire coéquipier en soirée jeux de société ?",
		options: [
			"Veigar",
			"Shaco",
			"Gangplank",
			"Twitch",
			"Renata Glasc",
			"LeBlanc",
			"Swain",
			"Fiddlesticks",
			"Zilean",
			"Viktor",
		],
		premium: false,
	},
	{
		question: "Qui ferait le meilleur videur de boîte de nuit ?",
		options: [
			"Braum",
			"Sion",
			"Ornn",
			"Malphite",
			"Nautilus",
			"Sett",
			"K'Sante",
			"Zac",
			"Mundo",
			"Blitzcrank",
		],
		premium: false,
	},
	{
		question: "Qui a le plus de mental de tank en interview ?",
		options: [
			"Garen",
			"Braum",
			"Shen",
			"Galio",
			"Ornn",
			"Poppy",
			"Taric",
			"Sejuani",
			"Rell",
			"Alistar",
		],
		premium: false,
	},
	{
		question: "Qui serait le pire vendeur de voitures d'occasion ?",
		options: [
			"Twisted Fate",
			"Gangplank",
			"Graves",
			"Jinx",
			"Sivir",
			"Renata Glasc",
			"Ekko",
			"Twitch",
			"Singed",
			"Viktor",
		],
		premium: false,
	},
	{
		question: "Qui gagnerait à Koh-Lanta sans hésiter ?",
		options: [
			"Nidalee",
			"Rengar",
			"Kindred",
			"Kled",
			"Sejuani",
			"Udyr",
			"Volibear",
			"Nunu & Willump",
			"Warwick",
			"Zac",
		],
		premium: false,
	},
	{
		question: "Qui aurait la meilleure chaîne ASMR ?",
		options: [
			"Karma",
			"Soraka",
			"Janna",
			"Ivern",
			"Bard",
			"Milio",
			"Nami",
			"Lulu",
			"Sona",
			"Zilean",
		],
		premium: false,
	},
	{
		question: "Qui a le skin le plus surcoté ?",
		options: [
			"Yasuo",
			"Lux",
			"Ahri",
			"Jhin",
			"Ezreal",
			"Kai'Sa",
			"Yone",
			"Miss Fortune",
			"Akali",
			"Vayne",
		],
		premium: true,
	},
	{
		question: "Qui gère le pire son abonnement Fortnite avec ses gains ?",
		options: [
			"Draven",
			"Jinx",
			"Ziggs",
			"Tristana",
			"Ekko",
			"Zeri",
			"Kled",
			"Vi",
			"Jayce",
			"Caitlyn",
		],
		premium: true,
	},
	{
		question: "Qui a le pire goût musical selon toi ?",
		options: [
			"Teemo",
			"Yuumi",
			"Master Yi",
			"Garen",
			"Annie",
			"Poppy",
			"Gnar",
			"Rumble",
			"Ziggs",
			"Heimerdinger",
		],
		premium: false,
	},
	{
		question: "Qui serait insupportable en groupe WhatsApp de classe ?",
		options: [
			"Draven",
			"Twitch",
			"Zoe",
			"Vex",
			"Renata Glasc",
			"Tahm Kench",
			"Yuumi",
			"Katarina",
			"Fiddlesticks",
			"Gangplank",
		],
		premium: false,
	},
	{
		question: "Qui a la démarche la plus stylée en jeu ?",
		options: [
			"Camille",
			"Akali",
			"Sylas",
			"Yone",
			"Qiyana",
			"Sett",
			"Vayne",
			"Ahri",
			"Jhin",
			"Rakan",
		],
		premium: false,
	},
	{
		question: "Qui serait le pire arbitre de foot ?",
		options: [
			"Blitzcrank",
			"Braum",
			"Poppy",
			"Zac",
			"Nautilus",
			"Rell",
			"Leona",
			"Alistar",
			"Sion",
			"Malphite",
		],
		premium: false,
	},
	{
		question: "Qui aurait la meilleure ligne de vêtements ?",
		options: [
			"Ezreal",
			"Camille",
			"Aphelios",
			"Evelynn",
			"Vayne",
			"Sivir",
			"Rakan",
			"Xayah",
			"Ahri",
			"K'Sante",
		],
		premium: true,
	},
	{
		question: "Qui te trahirait en premier dans un jeu de société ?",
		options: [
			"LeBlanc",
			"Twisted Fate",
			"Katarina",
			"Renata Glasc",
			"Shaco",
			"Zed",
			"Viego",
			"Swain",
			"Fiddlesticks",
			"Kayn",
		],
		premium: true,
	},
	{
		question: "Qui a le plus de swag en dehors de la Rift ?",
		options: [
			"Sett",
			"Yone",
			"Aphelios",
			"K'Sante",
			"Ezreal",
			"Qiyana",
			"Samira",
			"Akali",
			"Rakan",
			"Sylas",
		],
		premium: false,
	},
	{
		question: "Qui te fait le plus vieillir de dix ans en teamfight ?",
		options: [
			"Yasuo",
			"Zed",
			"Kayn",
			"Vayne",
			"Katarina",
			"Yone",
			"Fizz",
			"Riven",
			"Qiyana",
			"Akali",
		],
		premium: false,
	},
	{
		question: "Qui serait le pire coloc pour les factures d'électricité ?",
		options: [
			"Volibear",
			"Sion",
			"Mundo",
			"Ornn",
			"Malphite",
			"Sett",
			"Darius",
			"Nasus",
			"Trundle",
			"Olaf",
		],
		premium: false,
	},
	{
		question: "Qui a le plus de charisme malgré une sale réputation ?",
		options: [
			"Draven",
			"Twisted Fate",
			"Jhin",
			"Gangplank",
			"Sett",
			"Katarina",
			"Viego",
			"Sylas",
			"Kayn",
			"LeBlanc",
		],
		premium: false,
	},
	{
		question: "Qui ferait le meilleur GM d'une équipe pro ?",
		options: [
			"Heimerdinger",
			"Viktor",
			"Orianna",
			"Ezreal",
			"Ryze",
			"Swain",
			"Renata Glasc",
			"Camille",
			"Jayce",
			"Vi",
		],
		premium: false,
	},
	{
		question: "Qui aurait le plus de mal à passer le permis ?",
		options: [
			"Teemo",
			"Yuumi",
			"Zilean",
			"Bard",
			"Kled",
			"Rammus",
			"Corki",
			"Tristana",
			"Gnar",
			"Ziggs",
		],
		premium: false,
	},
	{
		question: "Qui a le plus de peine à admettre ses torts ?",
		options: [
			"Yasuo",
			"Draven",
			"Riven",
			"Katarina",
			"Zed",
			"Swain",
			"Darius",
			"Sylas",
			"Kayn",
			"Aatrox",
		],
		premium: false,
	},
	{
		question: "Qui aurait la pire note Google en tant que restaurant ?",
		options: [
			"Tahm Kench",
			"Cho'Gath",
			"Gragas",
			"Kog'Maw",
			"Singed",
			"Mundo",
			"Ziggs",
			"Renata Glasc",
			"Twitch",
			"Urgot",
		],
		premium: false,
	},
	{
		question: "Qui te lâche en pleine soirée sans prévenir ?",
		options: [
			"Ezreal",
			"Kayn",
			"Zed",
			"Talon",
			"Rengar",
			"Akali",
			"Twisted Fate",
			"Graves",
			"Aphelios",
			"Sylas",
		],
		premium: true,
	},
	{
		question: "Qui aurait la plus grosse communauté de fans toxiques ?",
		options: [
			"Yasuo",
			"Yone",
			"Riven",
			"Zed",
			"Katarina",
			"Draven",
			"Vayne",
			"Master Yi",
			"Lee Sin",
			"Akali",
		],
		premium: true,
	},
	{
		question: "Qui serait le meilleur coach de vie sur les réseaux ?",
		options: [
			"Ornn",
			"Ivern",
			"Braum",
			"Soraka",
			"Karma",
			"Zilean",
			"Nami",
			"Taric",
			"Janna",
			"Milio",
		],
		premium: false,
	},
	{
		question: "Qui a la pire hygiène de vie hors de la Faille ?",
		options: [
			"Gragas",
			"Tryndamere",
			"Draven",
			"Twitch",
			"Sion",
			"Mundo",
			"Olaf",
			"Kled",
			"Trundle",
			"Singed",
		],
		premium: false,
	},
	{
		question: "Qui gagnerait un battle de barres au premier tour ?",
		options: [
			"Draven",
			"Jhin",
			"Katarina",
			"Zed",
			"Sett",
			"Qiyana",
			"Yasuo",
			"Akali",
			"Gangplank",
			"Sylas",
		],
		premium: false,
	},
	{
		question: "Qui organiserait la pire after ?",
		options: [
			"Gragas",
			"Jinx",
			"Draven",
			"Tristana",
			"Vi",
			"Kled",
			"Twitch",
			"Ziggs",
			"Ekko",
			"Sett",
		],
		premium: true,
	},
	{
		question: "Qui aurait le plus de mal à se faire des amis IRL ?",
		options: [
			"Veigar",
			"Fiddlesticks",
			"Cho'Gath",
			"Nocturne",
			"Zed",
			"Kayn",
			"Vex",
			"Twisted Fate",
			"Shaco",
			"Rengar",
		],
		premium: false,
	},
	{
		question: "Qui a la meilleure aura de méchant de film ?",
		options: [
			"Swain",
			"Viego",
			"LeBlanc",
			"Mordekaiser",
			"Renata Glasc",
			"Aatrox",
			"Kayn",
			"Sylas",
			"Veigar",
			"Malzahar",
		],
		premium: false,
	},
	{
		question: "Qui serait la pire personne à croiser en soirée pyjama ?",
		options: [
			"Shaco",
			"Fiddlesticks",
			"Zed",
			"Nocturne",
			"Evelynn",
			"Elise",
			"Vex",
			"LeBlanc",
			"Kayn",
			"Twisted Fate",
		],
		premium: false,
	},
	{
		question: "Qui te fait le plus stresser en lane phase ?",
		options: [
			"Zed",
			"Yasuo",
			"Katarina",
			"Talon",
			"Renekton",
			"Riven",
			"Fizz",
			"Akali",
			"Qiyana",
			"Kassadin",
		],
		premium: false,
	},
	{
		question: "Qui te rembourserait jamais un prêt ?",
		options: [
			"Twisted Fate",
			"Gangplank",
			"Draven",
			"Renata Glasc",
			"Sivir",
			"Jinx",
			"Graves",
			"Miss Fortune",
			"Ezreal",
			"Vex",
		],
		premium: true,
	},
	{
		question: "Qui serait champion olympique sans effort ?",
		options: [
			"Lee Sin",
			"Yasuo",
			"Irelia",
			"Camille",
			"Akali",
			"Sylas",
			"Rengar",
			"Kayn",
			"Vi",
			"Riven",
		],
		premium: false,
	},
	{
		question: "Qui aurait la meilleure série Netflix sur sa vie ?",
		options: [
			"Viego",
			"Jinx",
			"Vi",
			"Ekko",
			"Caitlyn",
			"Jayce",
			"Ambessa",
			"Renata Glasc",
			"Warwick",
			"Zeri",
		],
		premium: false,
	},
	{
		question: "Qui a la plus grosse énergie villain arc ?",
		options: [
			"Jinx",
			"Sylas",
			"Viego",
			"Kayn",
			"Aatrox",
			"Evelynn",
			"Yone",
			"Riven",
			"Zed",
			"LeBlanc",
		],
		premium: false,
	},
	{
		question: "Qui ferait le meilleur host de talk-show ?",
		options: [
			"Twisted Fate",
			"Bard",
			"Gangplank",
			"Braum",
			"Rakan",
			"Ziggs",
			"Ahri",
			"Ezreal",
			"Sivir",
			"Karma",
		],
		premium: false,
	},
	{
		question: "Qui aurait le plus de mal à gérer un heartbreak ?",
		options: [
			"Yone",
			"Aatrox",
			"Viego",
			"Sylas",
			"Kalista",
			"Riven",
			"Zed",
			"Karthus",
			"Jhin",
			"Yasuo",
		],
		premium: true,
	},
	{
		question: "Qui gagnerait un débat en trois secondes chrono ?",
		options: [
			"Swain",
			"Renata Glasc",
			"LeBlanc",
			"Viktor",
			"Orianna",
			"Camille",
			"Heimerdinger",
			"Ryze",
			"Cassiopeia",
			"Malzahar",
		],
		premium: false,
	},
	{
		question: "Qui serait la pire baby-sitter de tous les temps ?",
		options: [
			"Shaco",
			"Zed",
			"Katarina",
			"Twitch",
			"Draven",
			"Fiddlesticks",
			"Renekton",
			"Kled",
			"Tryndamere",
			"Vladimir",
		],
		premium: false,
	},
	{
		question: "Qui aurait la plus grosse hype avant un blind date ?",
		options: [
			"Ezreal",
			"Rakan",
			"Sett",
			"Yone",
			"Ahri",
			"Qiyana",
			"Aphelios",
			"Sylas",
			"Kai'Sa",
			"Samira",
		],
		premium: true,
	},
	{
		question: "Qui serait le pire influenceur voyage ?",
		options: [
			"Twisted Fate",
			"Gangplank",
			"Miss Fortune",
			"Nilah",
			"Yasuo",
			"Sivir",
			"Ezreal",
			"Illaoi",
			"Pyke",
			"Nautilus",
		],
		premium: false,
	},
	{
		question: "Qui a la plus grosse aura quand il entre dans une salle ?",
		options: [
			"Mordekaiser",
			"Sett",
			"Aatrox",
			"K'Sante",
			"Camille",
			"Darius",
			"Viego",
			"Swain",
			"Renata Glasc",
			"Sylas",
		],
		premium: false,
	},
	{
		question: "Qui serait le plus susceptible de se faire arnaquer ?",
		options: [
			"Yuumi",
			"Nami",
			"Milio",
			"Bard",
			"Ivern",
			"Poppy",
			"Zilean",
			"Soraka",
			"Amumu",
			"Teemo",
		],
		premium: false,
	},
	{
		question: "Qui gagnerait un roast battle sans forcer ?",
		options: [
			"Draven",
			"Katarina",
			"Vex",
			"Zoe",
			"Gangplank",
			"Twisted Fate",
			"Jinx",
			"LeBlanc",
			"Renata Glasc",
			"Sett",
		],
		premium: false,
	},
	{
		question: "Qui te ferait le plus douter de tes choix de vie ?",
		options: [
			"Veigar",
			"Fiddlesticks",
			"Swain",
			"Renata Glasc",
			"Mordekaiser",
			"Viego",
			"LeBlanc",
			"Malzahar",
			"Karthus",
			"Aatrox",
		],
		premium: true,
	},
	{
		question: "Qui serait le meilleur capitaine de bateau pirate ?",
		options: [
			"Gangplank",
			"Miss Fortune",
			"Twisted Fate",
			"Illaoi",
			"Pyke",
			"Nautilus",
			"Fizz",
			"Nilah",
			"Graves",
			"Rek'Sai",
		],
		premium: false,
	},
	{
		question: "Qui aurait le pire karma sur les réseaux sociaux ?",
		options: [
			"Draven",
			"Zed",
			"Katarina",
			"Yasuo",
			"Twitch",
			"Vex",
			"Renata Glasc",
			"Sett",
			"Gangplank",
			"Riven",
		],
		premium: false,
	},
];

@Component({
	selector: "app-tiktok-ranking",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./tiktok-ranking.component.html",
	styleUrl: "./tiktok-ranking.component.scss",
})
export class TiktokRankingComponent implements OnDestroy {
	private readonly hostElement = inject(ElementRef<HTMLElement>);
	protected readonly slots = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	protected readonly maxRounds = computed(() =>
		this.mix.active()
			? this.mix.roundSize()
			: this.settings.roundsFor("tiktok-ranking"),
	);
	index = signal(0);
	selectedSlot = signal(1);
	placement = signal<Record<number, string>>({});
	submitted = signal(false);
	results = signal<TiktokResults | null>(null);
	progress = signal<{ ready: number; total: number }>({ ready: 0, total: 0 });
	dragged = signal<string | null>(null);
	reviewIndex = signal(0);
	revealIntro = signal(false);
	tribunal = signal<TribunalPayload | null>(null);
	fraudVotes = signal<Record<string, Record<number, string[]>>>({});
	private readonly autoAdvancedFor = signal<string | null>(null);
	protected readonly timer = new RoundTimer();
	protected remainingSec = signal(0);
	finished = computed(() => this.index() >= this.maxRounds());
	round = computed(() => {
		const roomCode = this.room.room()?.code ?? "default";
		const seed = this.hashCode(roomCode);
		const idx = (seed + this.index()) % ROUNDS.length;
		return ROUNDS[idx];
	});
	locked = computed(() => this.submitted() && !this.results());
	/** Ligne du classement de reference (consensus) actuellement revelee pendant le stagger. */
	protected revealedRows = signal(0);
	/**
	 * Handlers socket enregistres par CETTE instance : desinscrits dans
	 * ngOnDestroy. Sans ca, chaque partie de Tier List laissait une instance
	 * morte qui reagissait encore aux events tiktok:* suivants (sons fantomes,
	 * emissions tiktok:review-next en double via les setTimeout survivants).
	 */
	private readonly socketHandlers: [string, (payload: never) => void][] = [];
	private revealIntroTimer?: number;
	private tribunalTimer?: number;
	private autoAdvanceTimer?: number;

	private listen<T>(event: string, handler: (payload: T) => void): void {
		this.socket.on(event, handler);
		this.socketHandlers.push([event, handler]);
	}

	constructor(
		protected room: RoomService,
		protected mix: MixRuntimeService,
		private readonly socket: SocketService,
		protected readonly settings: GameSettingsService,
		private readonly audio: AudioService,
	) {
		this.listen<{ question: string; ready: number; total: number }>(
			"tiktok:progress",
			(payload) => {
				if (payload.question === this.round().question)
					this.progress.set({ ready: payload.ready, total: payload.total });
			},
		);
		this.listen<TiktokResults>("tiktok:results", (payload) => {
			if (payload.question === this.round().question) {
				this.progress.set({ ready: payload.ready, total: payload.total });
				this.results.set(payload);
				this.reviewIndex.set(0);
				this.fraudVotes.set({});
				this.revealIntro.set(true);
				this.audio.play("reveal", { volume: 0.7 });
				this.revealIntroTimer = window.setTimeout(
					() => this.revealIntro.set(false),
					1100,
				);
			}
		});
		this.listen<{
			question: string;
			targetPlayerId: string;
			votes: Record<number, string[]>;
		}>("tiktok:fraud-state", (payload) => {
			if (payload.question !== this.round().question) return;
			this.fraudVotes.update((state) => ({
				...state,
				[payload.targetPlayerId]: payload.votes,
			}));
		});
		const TRIBUNAL_DURATION = 7000;
		this.listen<{
			question: string;
			nextIndex: number;
			complete: boolean;
			tribunal: TribunalPayload;
		}>("tiktok:review-advance", (payload) => {
			if (payload.question !== this.round().question) return;
			this.tribunal.set(payload.tribunal);
			this.tribunalTimer = window.setTimeout(() => {
				this.tribunal.set(null);
				if (payload.complete) {
					if (!this.mix.active()) this.nextLocalRound();
					return;
				}
				this.reviewIndex.set(payload.nextIndex);
			}, TRIBUNAL_DURATION);
		});

		// Fait avancer le tribunal automatiquement des que le jury a fini de
		// voter : plus besoin que l'host clique manuellement a chaque joueur.
		// Un court delai laisse quand meme le temps de regarder la tier list
		// (utile a moins de 3 joueurs, ou le jury est toujours "pret" direct).
		effect(() => {
			const row = this.currentReview();
			const ready = this.juryReady();
			if (!row || !ready) return;
			if (!this.room.isHost()) return;
			if (this.autoAdvancedFor() === row.playerId) return;
			this.autoAdvancedFor.set(row.playerId);
			const reviewedId = row.playerId;
			this.autoAdvanceTimer = window.setTimeout(() => {
				if (this.currentReview()?.playerId === reviewedId) this.hostNextReview();
			}, 1500);
		});

		// Entree cinematique de la grille de classement (drop-zones + pool qui punchent).
		effect(() => {
			this.index();
			if (this.finished() || this.results()) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".question-hero"));
				slideUp(host.querySelector(".tier-board"), { delay: 0.1 });
				slideUp(host.querySelector(".pool-dock"), { delay: 0.16 });
			});
		});

		// Reveal cinematique : chaque ligne du classement compare apparait en
		// stagger marque, avec un son par ligne et un glow quand le joueur colle
		// au consensus (cf. `.review-slot.same` dans le template).
		effect(() => {
			const row = this.currentReview();
			if (!row || this.revealIntro()) return;
			this.revealedRows.set(0);
			const host: HTMLElement = this.hostElement.nativeElement;
			requestAnimationFrame(() => {
				const els: HTMLElement[] = Array.from(
					host.querySelectorAll(".review-slot"),
				);
				if (!els.length) return;
				gsap.killTweensOf(els);
				gsap.set(els, { opacity: 0, y: 22, scale: 0.94 });
				els.forEach((el, i) => {
					gsap.to(el, {
						opacity: 1,
						y: 0,
						scale: 1,
						duration: 0.42,
						delay: i * 0.14,
						ease: "back.out(1.6)",
						onStart: () => {
							this.audio.play("score-tick", { volume: 0.35, rate: 1 + i * 0.03 });
							this.revealedRows.set(i + 1);
							if (el.classList.contains("same")) {
								pulse(el, 1.05);
								burstParticles(host.querySelector(".review-tierlist"), {
									colors: ["#ff4fd8", "#ffe08a", "#ffffff"],
									count: 14,
									origin: {
										x: el.offsetLeft + el.offsetWidth * 0.15,
										y: el.offsetTop + el.offsetHeight / 2,
									},
									spread: 60,
								});
							}
						},
					});
				});
			});
		});
		// Battement sourd sur les 5 dernieres secondes du timer de classement.
		effect(() => {
			const secondsLeft = this.remainingSec();
			if (!this.submitted() && secondsLeft > 0 && secondsLeft <= 5) {
				this.audio.play("timer-urgent", { volume: 0.6 });
			}
		});
		// Ecran de fin : fanfare + confettis, comme les autres mini-jeux cinematiques.
		effect(() => {
			if (!this.finished()) return;
			this.audio.play("fanfare");
			const host = this.hostElement.nativeElement;
			animateEndScreen(host);
			requestAnimationFrame(() =>
				burstParticles(host.querySelector(".end-screen"), { count: 40, colors: ["#ff4fd8", "#ffe08a", "#ffffff"] }),
			);
		});
		this.startRoundTimer();
	}
	ngOnDestroy(): void {
		this.timer.stop();
		clearTimeout(this.revealIntroTimer);
		clearTimeout(this.tribunalTimer);
		clearTimeout(this.autoAdvanceTimer);
		for (const [event, handler] of this.socketHandlers)
			this.socket.off(event, handler as (...args: unknown[]) => void);
	}

	private startRoundTimer() {
		this.timer.start(
			this.settings.roundTimeSec(),
			(secondsLeft) => this.remainingSec.set(secondsLeft),
			() => this.handleTimeout(),
		);
	}
	private handleTimeout() {
		if (this.submitted()) return;
		this.audio.play("timeout", { volume: 0.7 });
		const unused = this.round().options.filter((champ) => !this.isUsed(champ));
		let cursor = 0;
		for (const slot of this.slots) {
			if (!this.placement()[slot] && cursor < unused.length) {
				this.placeOnSlot(unused[cursor], slot);
				cursor += 1;
			}
		}
		this.validate();
	}

	private shuffleRounds(): RankingRound[] {
		const copy = [...ROUNDS];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}

	icon(champ?: string) {
		return champ === "Blue Buff"
			? "https://ddragon.leagueoflegends.com/cdn/15.24.1/img/profileicon/23.png"
			: championSquareUrl(champ ?? "Yasuo");
	}
	fallback(event: Event) {
		(event.target as HTMLImageElement).style.visibility = "hidden";
	}
	isUsed(champ: string) {
		return Object.values(this.placement()).includes(champ);
	}
	filledCount() {
		return Object.keys(this.placement()).length;
	}
	selectSlot(slot: number): void {
		if (!this.submitted()) this.selectedSlot.set(slot);
	}
	dragStart(event: DragEvent, champ: string): void {
		if (this.submitted()) return;
		this.dragged.set(champ);
		event.dataTransfer?.setData("text/plain", champ);
	}
	allowDrop(event: DragEvent): void {
		event.preventDefault();
	}
	dropOnSlot(event: DragEvent, slot: number): void {
		event.preventDefault();
		if (this.submitted()) return;
		const champ = event.dataTransfer?.getData("text/plain") || this.dragged();
		if (champ) this.placeOnSlot(champ, slot);
	}
	place(champ: string) {
		if (this.submitted()) return;
		this.placeOnSlot(champ, this.selectedSlot());
		const nextSlot = this.slots.find((slot) => !this.placement()[slot]);
		if (nextSlot) this.selectedSlot.set(nextSlot);
	}
	private placeOnSlot(champ: string, slot: number): void {
		this.audio.play("swap", { volume: 0.45 });
		this.placement.update((p) => {
			const next = { ...p };
			for (const [usedSlot, usedChamp] of Object.entries(next))
				if (usedChamp === champ) delete next[Number(usedSlot)];
			next[slot] = champ;
			return next;
		});
	}
	validate() {
		if (this.filledCount() < 10 || this.submitted()) return;
		this.timer.stop();
		this.submitted.set(true);
		this.audio.play("correct", { volume: 0.8 });
		this.progress.set({ ready: 1, total: this.room.players().length });
		this.socket.emit("tiktok:submit", {
			question: this.round().question,
			placement: this.placement(),
		});
	}
	/** Identifiant de tier cinematique (S/A/B/C) pour un slot de classement donne. */
	tierOf(slot: number): TierId {
		return TIER_BOUNDS.find((t) => t.slots.includes(slot))?.id ?? "C";
	}
	/** Slots regroupes par tier, dans l'ordre S -> C, pour l'affichage en colonnes. */
	tierGroups(): { id: TierId; slots: number[] }[] {
		return TIER_BOUNDS;
	}

	currentReview(): TiktokPlayerResult | null {
		return this.results()?.byPlayer[this.reviewIndex()] ?? null;
	}
	champFor(row: TiktokPlayerResult | null, slot: number): string {
		return row?.placement?.[slot] ?? "";
	}
	myRow(): TiktokPlayerResult | null {
		return (
			this.results()?.byPlayer.find(
				(row) => row.playerId === this.room.myId(),
			) ?? null
		);
	}
	sameAsMe(row: TiktokPlayerResult | null, slot: number): boolean {
		const mine = this.myRow();
		return (
			!!row &&
			!!mine &&
			row.playerId !== mine.playerId &&
			row.placement[slot] === mine.placement[slot]
		);
	}
	sameChampionDifferentSlot(
		row: TiktokPlayerResult | null,
		slot: number,
	): boolean {
		const mine = this.myRow();
		const champ = row?.placement?.[slot];
		if (
			!row ||
			!mine ||
			row.playerId === mine.playerId ||
			!champ ||
			this.sameAsMe(row, slot)
		)
			return false;
		return Object.values(mine.placement).includes(champ);
	}
	isUniquePlacement(row: TiktokPlayerResult | null, slot: number): boolean {
		const champ = row?.placement?.[slot];
		const rows = this.results()?.byPlayer ?? [];
		return (
			!!champ &&
			rows.filter((r) => r.placement[slot] === champ).length === 1 &&
			rows.length > 1
		);
	}
	placementTag(row: TiktokPlayerResult | null, slot: number): string {
		if (this.sameAsMe(row, slot)) return "Même place que toi";
		if (this.sameChampionDifferentSlot(row, slot))
			return "Même champion, pas même rang";
		if (this.isUniquePlacement(row, slot)) return "Take solitaire";
		const champ = row?.placement?.[slot] ?? "";
		return `${this.percentFor(slot, champ)}% du lobby`;
	}
	tribunalEnabled(): boolean {
		return (this.results()?.total ?? this.room.players().length) >= 3;
	}
	canVoteFraud(row: TiktokPlayerResult | null): boolean {
		return this.tribunalEnabled() && !!row && row.playerId !== this.room.myId();
	}
	hasMyFraudVote(targetPlayerId?: string, slot?: number): boolean {
		if (!targetPlayerId || !slot || !this.room.myId()) return false;
		return (this.fraudVotes()[targetPlayerId]?.[slot] ?? []).includes(
			this.room.myId()!,
		);
	}
	fraudCount(targetPlayerId?: string, slot?: number): number {
		if (!targetPlayerId || !slot) return 0;
		return this.fraudVotes()[targetPlayerId]?.[slot]?.length ?? 0;
	}
	toggleFraud(targetPlayerId?: string, slot?: number): void {
		if (!targetPlayerId || !slot || !this.canVoteFraud(this.currentReview()))
			return;
		this.socket.emit("tiktok:fraud-toggle", {
			question: this.round().question,
			targetPlayerId,
			slot,
		});
	}
	hostNextReview(): void {
		if (!this.room.isHost() || !this.results()) return;
		const row = this.currentReview();
		if (!row) return;
		this.socket.emit("tiktok:review-next", {
			question: this.round().question,
			reviewedPlayerId: row.playerId,
		});
	}

	topBySlot(slot: number): string {
		const rows = this.results()?.byPlayer ?? [];
		const counts = new Map<string, number>();
		for (const row of rows) {
			const champ = row.placement[slot];
			if (champ) counts.set(champ, (counts.get(champ) ?? 0) + 1);
		}
		return (
			[...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
			this.placement()[slot] ??
			"Yasuo"
		);
	}
	percentFor(slot: number, champ: string): number {
		const rows = this.results()?.byPlayer ?? [];
		if (!rows.length || !champ) return 0;
		const count = rows.filter((row) => row.placement[slot] === champ).length;
		return Math.round((count / rows.length) * 100);
	}
	playerCards(row: TiktokPlayerResult | null): string[] {
		if (!row) return [];
		const rows = this.results()?.byPlayer ?? [];
		const mine = this.myRow();
		const exact =
			mine && mine.playerId !== row.playerId
				? this.slots.filter(
						(slot) => mine.placement[slot] === row.placement[slot],
					).length
				: 0;
		const top = row.placement[1];
		const bottom = row.placement[10];
		const unique = this.slots.filter((slot) =>
			this.isUniquePlacement(row, slot),
		);
		const community = this.fakeCommunityTop();
		const cards = [
			`${row.pseudo} met ${top} Top 1. ${this.percentFor(1, top)}% du lobby valide cette couronne.`,
			`Communauté fictive : ${community} garde la couronne avec ${this.fakeCommunityPercent()}%.`,
			mine && mine.playerId !== row.playerId
				? `${exact}/10 placements identiques avec toi. ${exact >= 6 ? "Même cerveau, inquiétant." : exact <= 2 ? "Vous ne jouez pas au même jeu." : "Désaccord raisonnable."}`
				: `C’est ta tier list. Assume devant le tribunal.`,
			unique.length
				? `${row.pseudo} a ${unique.length} take(s) solitaire(s), dont #${unique[0]} ${row.placement[unique[0]]}.`
				: `Aucune take totalement isolée. Lobby presque civilisé.`,
			`${bottom} finit Top 10 chez ${row.pseudo}. C’est personnel à ce niveau.`,
		];
		return cards;
	}
	fakeCommunityTop(): string {
		return (
			this.round().options[
				Math.abs(this.hash(this.round().question)) % this.round().options.length
			] ?? this.round().options[0]
		);
	}
	fakeCommunityPercent(): number {
		return 56 + (Math.abs(this.hash(this.round().question + "x")) % 31);
	}
	private hash(value: string): number {
		return value
			.split("")
			.reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
	}
	scoreLabel(): string {
		return this.mix.active() ? "Mix en cours" : "Question terminée";
	}
	nextLocalRound() {
		this.audio.play("swap", { volume: 0.6 });
		this.index.update((i) => i + 1);
		this.placement.set({});
		this.selectedSlot.set(1);
		this.submitted.set(false);
		this.results.set(null);
		this.progress.set({ ready: 0, total: 0 });
		this.reviewIndex.set(0);
		this.fraudVotes.set({});
		this.tribunal.set(null);
		if (this.finished()) this.timer.stop();
		else this.startRoundTimer();
	}
	restart() {
		this.index.set(0);
		this.placement.set({});
		this.selectedSlot.set(1);
		this.submitted.set(false);
		this.results.set(null);
		this.progress.set({ ready: 0, total: 0 });
		this.reviewIndex.set(0);
		this.fraudVotes.set({});
		this.tribunal.set(null);
		this.startRoundTimer();
	}
	mainConviction(judgement: TribunalPayload) {
		return judgement.convicted?.[0] ?? null;
	}

	judgementJuryCount(judgement: TribunalPayload): number {
		const guilty = this.mainConviction(judgement);
		return (
			guilty?.threshold ?? this.results()?.total ?? this.room.players().length
		);
	}

	hasVotedFraudOnCurrentReview(): boolean {
		const targetId = this.currentReview()?.playerId;
		const myId = this.room.myId();
		if (!targetId || !myId) return false;

		return Object.values(this.fraudVotes()[targetId] ?? {}).some((votes) =>
			votes.includes(myId),
		);
	}

	voteFraud(targetPlayerId?: string, slot?: number): void {
		if (!targetPlayerId || !slot || !this.canVoteFraud(this.currentReview()))
			return;
		if (this.hasVotedFraudOnCurrentReview()) return;

		this.socket.emit("tiktok:fraud-vote", {
			question: this.round().question,
			targetPlayerId,
			slot,
		});
	}

	hasVotedWholeTierFraud(): boolean {
		const targetId = this.currentReview()?.playerId;
		const myId = this.room.myId();
		if (!targetId || !myId) return false;

		return (this.fraudVotes()[targetId]?.[0] ?? []).includes(myId);
	}

	voteWholeTierFraud(): void {
		const targetId = this.currentReview()?.playerId;
		if (!targetId || !this.canVoteFraud(this.currentReview())) return;
		if (this.hasVotedFraudOnCurrentReview() || this.hasVotedWholeTierFraud())
			return;

		this.socket.emit("tiktok:fraud-vote", {
			question: this.round().question,
			targetPlayerId: targetId,
			slot: 0,
		});
	}

	juryTotal(): number {
		const total = this.results()?.total ?? this.room.players().length;
		return Math.max(0, total - 1);
	}

	juryReadyCount(targetPlayerId?: string): number {
		if (!targetPlayerId) return 0;

		const votes = this.fraudVotes()[targetPlayerId] ?? {};
		const voters = new Set<string>();

		for (const list of Object.values(votes)) {
			for (const voter of list) voters.add(voter);
		}

		return voters.size;
	}

	hasVotedCleanTierList(): boolean {
		const targetId = this.currentReview()?.playerId;
		const myId = this.room.myId();
		if (!targetId || !myId) return false;

		return (this.fraudVotes()[targetId]?.[-1] ?? []).includes(myId);
	}

	voteCleanTierList(): void {
		const targetId = this.currentReview()?.playerId;
		if (!targetId || !this.canVoteFraud(this.currentReview())) return;
		if (
			this.hasVotedFraudOnCurrentReview() ||
			this.hasVotedWholeTierFraud() ||
			this.hasVotedCleanTierList()
		)
			return;

		this.socket.emit("tiktok:fraud-vote", {
			question: this.round().question,
			targetPlayerId: targetId,
			slot: -1,
		});
	}

	juryReady(): boolean {
		if (!this.tribunalEnabled()) return true;

		const targetId = this.currentReview()?.playerId;
		return this.juryReadyCount(targetId) >= this.juryTotal();
	}
	private hashCode(value: string): number {
		let hash = 0;

		for (let i = 0; i < value.length; i++) {
			hash = (hash * 31 + value.charCodeAt(i)) | 0;
		}

		return Math.abs(hash);
	}
}

interface TiktokPlayerResult {
	playerId: string;
	pseudo: string;
	placement: Record<number, string>;
}
interface TiktokResults {
	question: string;
	ready: number;
	total: number;
	byPlayer: TiktokPlayerResult[];
}
interface TribunalPayload {
	title: string;
	message: string;
	convicted: {
		slot: number;
		champion: string;
		votes: number;
		threshold: number;
	}[];
	counterFraud: {
		voterId: string;
		voterName: string;
		slot: number;
		champion: string;
	}[];
	penaltyLines: string[];
}
