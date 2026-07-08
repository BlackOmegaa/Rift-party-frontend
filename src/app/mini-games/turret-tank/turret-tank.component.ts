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
import { GameSettingsService } from "../../core/services/game-settings.service";
import { championLoadingUrl, itemIconUrl } from "../../shared/lol-assets";
import { RoundTimer } from "../../shared/round-timer";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { AudioService } from "../../core/services/audio.service";
import { animateEndScreen } from "../../shared/end-screen-animate";
import {
	burstParticles,
	floatScore,
	pulse,
	punchIn,
	shake,
	slideUp,
} from "../../shared/cinematic/cinematic";

interface Scenario {
	champ: string;
	level: number;
	/** PV totaux affichés (base au niveau + items) : le joueur calcule à partir de cette valeur. */
	hp: number;
	/** Armure totale affichée (base au niveau + items). */
	armor: number;
	items: string[];
	/** Label français du type de tour ("Première tour (T1)", "Tour du Nexus", ...). */
	turret: string;
	/** Minute de jeu : l'AD des tours monte avec le temps, indispensable pour estimer. */
	minute: number;
	answer: number;
	note: string;
}
// Scénarios générés par le pipeline officiel "coups de tour tankés" :
// stats champion Data Dragon 15.24.1 (formule de croissance officielle)
// + bonus d'items (item.json), pénétration d'armure fixe de 30% (passif
// des tours), ramp +50%/tir cap +150%, somme cumulée des dégâts.
// Validé sur 2 ancres mesurées en jeu (Ahri niv1 outer@3:00 = 3 coups,
// Ahri 1859PV/117arm outer@16:00 = 6 coups). Ne pas éditer à la main :
// régénérer via le script gen-turret-tank (réponse cible -> minute déduite).
const SCENARIOS: Scenario[] = [
	{
		champ: "Malphite",
		level: 6,
		hp: 1226,
		armor: 60,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 4,
		answer: 5,
		note: "Il fonce sur la tour… finalement, le seul vraiment stoppé, c'est lui.",
	},
	{
		champ: "Ornn",
		level: 7,
		hp: 1338,
		armor: 58,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 5,
		answer: 5,
		note: "Il forge des objets légendaires, mais toujours pas un anti-tour visiblement.",
	},
	{
		champ: "Rammus",
		level: 8,
		hp: 1403,
		armor: 61,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 12,
		answer: 4,
		note: "« Ok. » C'est aussi ce qu'a répondu la tour avant de continuer à tirer.",
	},
	{
		champ: "K'Sante",
		level: 9,
		hp: 1584,
		armor: 71,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 10,
		answer: 5,
		note: "Il repousse tout le monde… sauf les dégâts de la tour.",
	},
	{
		champ: "Alistar",
		level: 6,
		hp: 1309,
		armor: 59,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 11,
		answer: 4,
		note: "Il charge la tour de toutes ses forces. La tour répond avec intérêt.",
	},
	{
		champ: "Shen",
		level: 7,
		hp: 1240,
		armor: 54,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 10,
		answer: 4,
		note: "Il pourrait sauver un allié à l'autre bout de la carte… dommage qu'il soit occupé à mourir sous sa tour.",
	},
	{
		champ: "Zac",
		level: 8,
		hp: 1464,
		armor: 60,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 7,
		answer: 5,
		note: "Il rebondit partout, sauf hors de portée de la tour.",
	},
	{
		champ: "Braum",
		level: 9,
		hp: 1535,
		armor: 69,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 13,
		answer: 4,
		note: "Le bouclier protège les alliés… lui, c'est une autre histoire.",
	},
	{
		champ: "Poppy",
		level: 5,
		hp: 1100,
		armor: 50,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 8,
		answer: 4,
		note: "Elle adore empêcher les dashs. La tour, elle, empêche juste de vivre.",
	},
	{
		champ: "Leona",
		level: 4,
		hp: 875,
		armor: 54,
		items: [],
		turret: "Première tour (T1)",
		minute: 11,
		answer: 3,
		note: "Elle engage sans hésiter. La tour aussi.",
	},
	{
		champ: "Sion",
		level: 6,
		hp: 1149,
		armor: 53,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 3,
		answer: 5,
		note: "Même mort, il continue d'avancer. La tour aussi.",
	},
	{
		champ: "Volibear",
		level: 7,
		hp: 1304,
		armor: 60,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 11,
		answer: 4,
		note: "Il coupe les tours… encore faut-il survivre jusqu'à l'arrivée.",
	},
	{
		champ: "Gragas",
		level: 8,
		hp: 1454,
		armor: 67,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 13,
		answer: 4,
		note: "Le tonneau explose. Son HP aussi.",
	},
	{
		champ: "Sett",
		level: 9,
		hp: 1588,
		armor: 65,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 9,
		answer: 5,
		note: "Les abdos encaissent beaucoup de choses. Pas les tirs de tour.",
	},
	{
		champ: "Mordekaiser",
		level: 5,
		hp: 1116,
		armor: 50,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 8,
		answer: 4,
		note: "Il emmène ses ennemis dans son royaume. La tour lui avait déjà réservé une place.",
	},
	{
		champ: "Nasus",
		level: 4,
		hp: 1036,
		armor: 45,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 13,
		answer: 3,
		note: "Encore quelques stacks et il sera fort. Encore quelques tirs et il sera mort.",
	},
	{
		champ: "Garen",
		level: 8,
		hp: 1406,
		armor: 62,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 12,
		answer: 4,
		note: "DEMACIA ! La tour n'était pas impressionnée.",
	},
	{
		champ: "Aatrox",
		level: 9,
		hp: 1568,
		armor: 70,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 14,
		answer: 4,
		note: "Il refuse de mourir. La tour insiste.",
	},
	{
		champ: "Darius",
		level: 3,
		hp: 820,
		armor: 45,
		items: [],
		turret: "Première tour (T1)",
		minute: 10,
		answer: 3,
		note: "Cinq stacks… puis un tir de tour qui vole tout le travail.",
	},
	{
		champ: "Wukong",
		level: 5,
		hp: 1066,
		armor: 46,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 13,
		answer: 3,
		note: "Le clone trompe les joueurs. Pas la tour.",
	},
	{
		champ: "Pantheon",
		level: 7,
		hp: 1328,
		armor: 64,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 11,
		answer: 4,
		note: "Entrée spectaculaire. Sortie beaucoup moins.",
	},
	{
		champ: "Draven",
		level: 8,
		hp: 1276,
		armor: 55,
		items: ["Berserker"],
		turret: "Première tour (T1)",
		minute: 10,
		answer: 4,
		note: "Il adore être sous les projecteurs. La tour lui envoie toute la lumière.",
	},
	{
		champ: "Thresh",
		level: 6,
		hp: 1244,
		armor: 33,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 9,
		answer: 4,
		note: "Il lance une lanterne… personne ne clique.",
	},
	{
		champ: "Pyke",
		level: 7,
		hp: 1203,
		armor: 66,
		items: ["Ruby Crystal"],
		turret: "Première tour (T1)",
		minute: 10,
		answer: 4,
		note: "Il exécute tout le monde. La tour avait commencé avant lui.",
	},
	{
		champ: "Yasuo",
		level: 6,
		hp: 1025,
		armor: 50,
		items: ["Berserker"],
		turret: "Première tour (T1)",
		minute: 13,
		answer: 3,
		note: "Le vent bloque beaucoup de choses. Les tirs de tour, bizarrement non.",
	},
	{
		champ: "Vayne",
		level: 3,
		hp: 702,
		armor: 30,
		items: [],
		turret: "Première tour (T1)",
		minute: 14,
		answer: 2,
		note: "Invisible quelques secondes. Très visible sur la minimap après sa mort.",
	},
	{
		champ: "Lux",
		level: 3,
		hp: 726,
		armor: 29,
		items: [],
		turret: "Première tour (T1)",
		minute: 14,
		answer: 2,
		note: "Elle éclaire la carte entière. Son écran de mort aussi.",
	},
	{
		champ: "Yuumi",
		level: 5,
		hp: 713,
		armor: 38,
		items: [],
		turret: "Première tour (T1)",
		minute: 8,
		answer: 3,
		note: "Une fois descendue de son taxi, la tour s'occupe du reste.",
	},
	{
		champ: "Jinx",
		level: 7,
		hp: 1139,
		armor: 49,
		items: ["Berserker"],
		turret: "Première tour (T1)",
		minute: 14,
		answer: 3,
		note: "Tout est drôle… jusqu'au premier tir de tour.",
	},
	{
		champ: "Kai'Sa",
		level: 4,
		hp: 871,
		armor: 35,
		items: [],
		turret: "Première tour (T1)",
		minute: 10,
		answer: 3,
		note: "Elle évolue toute la partie. La tour, elle, est déjà au maximum.",
	},
	{
		champ: "Malphite",
		level: 10,
		hp: 1820,
		armor: 153,
		items: ["Sunfire","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 19,
		answer: 8,
		note: "Il fonce sur la tour… finalement, le seul vraiment stoppé, c'est lui.",
	},
	{
		champ: "Ornn",
		level: 11,
		hp: 2516,
		armor: 104,
		items: ["Heartsteel","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 21,
		answer: 8,
		note: "Il forge des objets légendaires, mais toujours pas un anti-tour visiblement.",
	},
	{
		champ: "Rammus",
		level: 12,
		hp: 2010,
		armor: 149,
		items: ["JakSho","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 23,
		answer: 7,
		note: "« Ok. » C'est aussi ce qu'a répondu la tour avant de continuer à tirer.",
	},
	{
		champ: "K'Sante",
		level: 13,
		hp: 2239,
		armor: 168,
		items: ["Iceborn Gauntlet","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 23,
		answer: 8,
		note: "Il repousse tout le monde… sauf les dégâts de la tour.",
	},
	{
		champ: "Alistar",
		level: 10,
		hp: 1964,
		armor: 151,
		items: ["Sunfire","Tabi"],
		turret: "Deuxième tour (T2)",
		minute: 23,
		answer: 7,
		note: "Il charge la tour de toutes ses forces. La tour répond avec intérêt.",
	},
	{
		champ: "Shen",
		level: 11,
		hp: 1829,
		armor: 141,
		items: ["JakSho","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 21,
		answer: 7,
		note: "Il pourrait sauver un allié à l'autre bout de la carte… dommage qu'il soit occupé à mourir sous sa tour.",
	},
	{
		champ: "Zac",
		level: 12,
		hp: 1758,
		armor: 179,
		items: ["Frozen Heart","Tabi"],
		turret: "Deuxième tour (T2)",
		minute: 27,
		answer: 6,
		note: "Il rebondit partout, sauf hors de portée de la tour.",
	},
	{
		champ: "Braum",
		level: 13,
		hp: 2206,
		armor: 160,
		items: ["Plated Steelcaps","JakSho"],
		turret: "Deuxième tour (T2)",
		minute: 22,
		answer: 8,
		note: "Le bouclier protège les alliés… lui, c'est une autre histoire.",
	},
	{
		champ: "Poppy",
		level: 10,
		hp: 1461,
		armor: 174,
		items: ["Tabi","Frozen Heart"],
		turret: "Deuxième tour (T2)",
		minute: 23,
		answer: 6,
		note: "Elle adore empêcher les dashs. La tour, elle, empêche juste de vivre.",
	},
	{
		champ: "Leona",
		level: 11,
		hp: 1532,
		armor: 185,
		items: ["Plated Steelcaps","Frozen Heart"],
		turret: "Deuxième tour (T2)",
		minute: 20,
		answer: 7,
		note: "Elle engage sans hésiter. La tour aussi.",
	},
	{
		champ: "Sion",
		level: 10,
		hp: 1728,
		armor: 94,
		items: ["Sterak","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 21,
		answer: 6,
		note: "Même mort, il continue d'avancer. La tour aussi.",
	},
	{
		champ: "Volibear",
		level: 11,
		hp: 2013,
		armor: 106,
		items: ["Stridebreaker","Tabi"],
		turret: "Deuxième tour (T2)",
		minute: 24,
		answer: 6,
		note: "Il coupe les tours… encore faut-il survivre jusqu'à l'arrivée.",
	},
	{
		champ: "Gragas",
		level: 12,
		hp: 2522,
		armor: 137,
		items: ["Sterak","Sunfire"],
		turret: "Deuxième tour (T2)",
		minute: 27,
		answer: 7,
		note: "Le tonneau explose. Son HP aussi.",
	},
	{
		champ: "Sett",
		level: 13,
		hp: 2768,
		armor: 84,
		items: ["Stridebreaker","Sterak"],
		turret: "Deuxième tour (T2)",
		minute: 25,
		answer: 7,
		note: "Les abdos encaissent beaucoup de choses. Pas les tirs de tour.",
	},
	{
		champ: "Mordekaiser",
		level: 10,
		hp: 2200,
		armor: 120,
		items: ["Sterak","Sunfire"],
		turret: "Deuxième tour (T2)",
		minute: 23,
		answer: 7,
		note: "Il emmène ses ennemis dans son royaume. La tour lui avait déjà réservé une place.",
	},
	{
		champ: "Nasus",
		level: 11,
		hp: 1913,
		armor: 150,
		items: ["Sunfire","Tabi"],
		turret: "Deuxième tour (T2)",
		minute: 27,
		answer: 6,
		note: "Encore quelques stacks et il sera fort. Encore quelques tirs et il sera mort.",
	},
	{
		champ: "Garen",
		level: 12,
		hp: 2105,
		armor: 104,
		items: ["Stridebreaker","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 25,
		answer: 6,
		note: "DEMACIA ! La tour n'était pas impressionnée.",
	},
	{
		champ: "Aatrox",
		level: 13,
		hp: 2748,
		armor: 91,
		items: ["Stridebreaker","Sterak"],
		turret: "Deuxième tour (T2)",
		minute: 29,
		answer: 6,
		note: "Il refuse de mourir. La tour insiste.",
	},
	{
		champ: "Darius",
		level: 10,
		hp: 1984,
		armor: 102,
		items: ["Stridebreaker","Tabi"],
		turret: "Deuxième tour (T2)",
		minute: 28,
		answer: 5,
		note: "Cinq stacks… puis un tir de tour qui vole tout le travail.",
	},
	{
		champ: "Wukong",
		level: 11,
		hp: 2329,
		armor: 72,
		items: ["Stridebreaker","Sterak"],
		turret: "Deuxième tour (T2)",
		minute: 24,
		answer: 6,
		note: "Le clone trompe les joueurs. Pas la tour.",
	},
	{
		champ: "Pantheon",
		level: 12,
		hp: 2173,
		armor: 114,
		items: ["Stridebreaker","Tabi"],
		turret: "Deuxième tour (T2)",
		minute: 30,
		answer: 5,
		note: "Entrée spectaculaire. Sortie beaucoup moins.",
	},
	{
		champ: "Draven",
		level: 13,
		hp: 1814,
		armor: 78,
		items: ["Kraken","Berserker"],
		turret: "Deuxième tour (T2)",
		minute: 30,
		answer: 4,
		note: "Il adore être sous les projecteurs. La tour lui envoie toute la lumière.",
	},
	{
		champ: "Thresh",
		level: 10,
		hp: 1549,
		armor: 133,
		items: ["Frozen Heart","Plated Steelcaps"],
		turret: "Deuxième tour (T2)",
		minute: 27,
		answer: 5,
		note: "Il lance une lanterne… personne ne clique.",
	},
	{
		champ: "Pyke",
		level: 11,
		hp: 1635,
		armor: 109,
		items: ["Tabi"],
		turret: "Deuxième tour (T2)",
		minute: 30,
		answer: 4,
		note: "Il exécute tout le monde. La tour avait commencé avant lui.",
	},
	{
		champ: "Yasuo",
		level: 12,
		hp: 1673,
		armor: 77,
		items: ["Kraken","Berserker"],
		turret: "Deuxième tour (T2)",
		minute: 29,
		answer: 4,
		note: "Le vent bloque beaucoup de choses. Les tirs de tour, bizarrement non.",
	},
	{
		champ: "Vayne",
		level: 10,
		hp: 1347,
		armor: 59,
		items: ["Kraken","Berserker"],
		turret: "Deuxième tour (T2)",
		minute: 25,
		answer: 4,
		note: "Invisible quelques secondes. Très visible sur la minimap après sa mort.",
	},
	{
		champ: "Lux",
		level: 11,
		hp: 1449,
		armor: 67,
		items: ["Rabadon","Lucidity Boots"],
		turret: "Deuxième tour (T2)",
		minute: 27,
		answer: 4,
		note: "Elle éclaire la carte entière. Son écran de mort aussi.",
	},
	{
		champ: "Yuumi",
		level: 12,
		hp: 1379,
		armor: 66,
		items: ["Moonstone","Lucidity Boots"],
		turret: "Deuxième tour (T2)",
		minute: 26,
		answer: 4,
		note: "Une fois descendue de son taxi, la tour s'occupe du reste.",
	},
	{
		champ: "Jinx",
		level: 13,
		hp: 1780,
		armor: 77,
		items: ["Kraken","Berserker"],
		turret: "Deuxième tour (T2)",
		minute: 29,
		answer: 4,
		note: "Tout est drôle… jusqu'au premier tir de tour.",
	},
	{
		champ: "Kai'Sa",
		level: 10,
		hp: 1429,
		armor: 58,
		items: ["Guinsoo","Berserker"],
		turret: "Deuxième tour (T2)",
		minute: 26,
		answer: 4,
		note: "Elle évolue toute la partie. La tour, elle, est déjà au maximum.",
	},
	{
		champ: "Malphite",
		level: 14,
		hp: 2272,
		armor: 250,
		items: ["Sunfire","Frozen Heart","Plated Steelcaps"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 36,
		answer: 10,
		note: "Il fonce sur la tour… finalement, le seul vraiment stoppé, c'est lui.",
	},
	{
		champ: "Ornn",
		level: 15,
		hp: 3706,
		armor: 197,
		items: ["Heartsteel","Sunfire","JakSho"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 10,
		note: "Il forge des objets légendaires, mais toujours pas un anti-tour visiblement.",
	},
	{
		champ: "Rammus",
		level: 16,
		hp: 2473,
		armor: 245,
		items: ["JakSho","Frozen Heart","Plated Steelcaps"],
		turret: "Tour du Nexus",
		minute: 40,
		answer: 9,
		note: "« Ok. » C'est aussi ce qu'a répondu la tour avant de continuer à tirer.",
	},
	{
		champ: "K'Sante",
		level: 17,
		hp: 3161,
		armor: 213,
		items: ["Iceborn Gauntlet","JakSho"],
		turret: "Tour du Nexus",
		minute: 41,
		answer: 10,
		note: "Il repousse tout le monde… sauf les dégâts de la tour.",
	},
	{
		champ: "Alistar",
		level: 18,
		hp: 3075,
		armor: 270,
		items: ["Sunfire","Frozen Heart","Tabi"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 10,
		note: "Il charge la tour de toutes ses forces. La tour répond avec intérêt.",
	},
	{
		champ: "Shen",
		level: 14,
		hp: 2507,
		armor: 205,
		items: ["JakSho","Sunfire","Plated Steelcaps"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 36,
		answer: 10,
		note: "Il pourrait sauver un allié à l'autre bout de la carte… dommage qu'il soit occupé à mourir sous sa tour.",
	},
	{
		champ: "Zac",
		level: 15,
		hp: 3381,
		armor: 220,
		items: ["Frozen Heart","Sunfire","Heartsteel"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 10,
		note: "Il rebondit partout, sauf hors de portée de la tour.",
	},
	{
		champ: "Braum",
		level: 16,
		hp: 2601,
		armor: 257,
		items: ["Plated Steelcaps","Sunfire","Frozen Heart"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 9,
		note: "Le bouclier protège les alliés… lui, c'est une autre histoire.",
	},
	{
		champ: "Poppy",
		level: 17,
		hp: 3039,
		armor: 234,
		items: ["Tabi","JakSho","Sunfire"],
		turret: "Tour du Nexus",
		minute: 41,
		answer: 10,
		note: "Elle adore empêcher les dashs. La tour, elle, empêche juste de vivre.",
	},
	{
		champ: "Leona",
		level: 18,
		hp: 2713,
		armor: 270,
		items: ["Plated Steelcaps","Frozen Heart","JakSho"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 9,
		note: "Elle engage sans hésiter. La tour aussi.",
	},
	{
		champ: "Sion",
		level: 14,
		hp: 2457,
		armor: 162,
		items: ["Sterak","Sunfire","Plated Steelcaps"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 36,
		answer: 9,
		note: "Même mort, il continue d'avancer. La tour aussi.",
	},
	{
		champ: "Volibear",
		level: 15,
		hp: 2880,
		armor: 129,
		items: ["Stridebreaker","Sterak","Tabi"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 38,
		answer: 8,
		note: "Il coupe les tours… encore faut-il survivre jusqu'à l'arrivée.",
	},
	{
		champ: "Gragas",
		level: 16,
		hp: 3055,
		armor: 185,
		items: ["Sterak","Sunfire","Plated Steelcaps"],
		turret: "Tour du Nexus",
		minute: 41,
		answer: 9,
		note: "Le tonneau explose. Son HP aussi.",
	},
	{
		champ: "Sett",
		level: 17,
		hp: 3312,
		armor: 132,
		items: ["Stridebreaker","Sterak","Tabi"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 8,
		note: "Les abdos encaissent beaucoup de choses. Pas les tirs de tour.",
	},
	{
		champ: "Mordekaiser",
		level: 18,
		hp: 4063,
		armor: 158,
		items: ["Sterak","Heartsteel","Sunfire"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 10,
		note: "Il emmène ses ennemis dans son royaume. La tour lui avait déjà réservé une place.",
	},
	{
		champ: "Nasus",
		level: 14,
		hp: 3157,
		armor: 166,
		items: ["Sunfire","Heartsteel","Plated Steelcaps"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 38,
		answer: 10,
		note: "Encore quelques stacks et il sera fort. Encore quelques tirs et il sera mort.",
	},
	{
		champ: "Garen",
		level: 15,
		hp: 2840,
		armor: 119,
		items: ["Stridebreaker","Sterak","Plated Steelcaps"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 37,
		answer: 8,
		note: "DEMACIA ! La tour n'était pas impressionnée.",
	},
	{
		champ: "Aatrox",
		level: 16,
		hp: 4050,
		armor: 107,
		items: ["Stridebreaker","Sterak","Heartsteel"],
		turret: "Tour du Nexus",
		minute: 41,
		answer: 9,
		note: "Il refuse de mourir. La tour insiste.",
	},
	{
		champ: "Darius",
		level: 14,
		hp: 2880,
		armor: 125,
		items: ["Stridebreaker","Sterak","Tabi"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 38,
		answer: 8,
		note: "Cinq stacks… puis un tir de tour qui vole tout le travail.",
	},
	{
		champ: "Wukong",
		level: 15,
		hp: 2773,
		armor: 118,
		items: ["Stridebreaker","Sterak","Plated Steelcaps"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 40,
		answer: 7,
		note: "Le clone trompe les joueurs. Pas la tour.",
	},
	{
		champ: "Pantheon",
		level: 16,
		hp: 3078,
		armor: 137,
		items: ["Stridebreaker","Sterak","Plated Steelcaps"],
		turret: "Tour du Nexus",
		minute: 41,
		answer: 8,
		note: "Entrée spectaculaire. Sortie beaucoup moins.",
	},
	{
		champ: "Draven",
		level: 17,
		hp: 2710,
		armor: 100,
		items: ["Kraken","Sterak","Berserker"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 6,
		note: "Il adore être sous les projecteurs. La tour lui envoie toute la lumière.",
	},
	{
		champ: "Thresh",
		level: 14,
		hp: 2421,
		armor: 178,
		items: ["Frozen Heart","Plated Steelcaps","JakSho"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 38,
		answer: 8,
		note: "Il lance une lanterne… personne ne clique.",
	},
	{
		champ: "Pyke",
		level: 15,
		hp: 2129,
		armor: 205,
		items: ["Tabi","Frozen Heart"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 41,
		answer: 7,
		note: "Il exécute tout le monde. La tour avait commencé avant lui.",
	},
	{
		champ: "Yasuo",
		level: 16,
		hp: 2182,
		armor: 99,
		items: ["Kraken","Guinsoo","Berserker"],
		turret: "Tour du Nexus",
		minute: 42,
		answer: 5,
		note: "Le vent bloque beaucoup de choses. Les tirs de tour, bizarrement non.",
	},
	{
		champ: "Vayne",
		level: 14,
		hp: 1795,
		armor: 79,
		items: ["Kraken","Guinsoo","Berserker"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 38,
		answer: 5,
		note: "Invisible quelques secondes. Très visible sur la minimap après sa mort.",
	},
	{
		champ: "Lux",
		level: 15,
		hp: 2043,
		armor: 90,
		items: ["Rabadon","Lucidity Boots","Ruby Crystal"],
		turret: "Tour d'inhibiteur (T3)",
		minute: 41,
		answer: 5,
		note: "Elle éclaire la carte entière. Son écran de mort aussi.",
	},
	{
		champ: "Yuumi",
		level: 16,
		hp: 1849,
		armor: 86,
		items: ["Moonstone","Lucidity Boots","Ruby Crystal"],
		turret: "Tour du Nexus",
		minute: 40,
		answer: 5,
		note: "Une fois descendue de son taxi, la tour s'occupe du reste.",
	},
	{
		champ: "Jinx",
		level: 17,
		hp: 2281,
		armor: 100,
		items: ["Kraken","Guinsoo","Berserker"],
		turret: "Tour du Nexus",
		minute: 40,
		answer: 6,
		note: "Tout est drôle… jusqu'au premier tir de tour.",
	},
	{
		champ: "Kai'Sa",
		level: 18,
		hp: 2374,
		armor: 96,
		items: ["Kraken","Guinsoo","Berserker"],
		turret: "Tour du Nexus",
		minute: 41,
		answer: 6,
		note: "Elle évolue toute la partie. La tour, elle, est déjà au maximum.",
	},
];

@Component({
	selector: "app-turret-tank",
	standalone: true,
	imports: [FormsModule, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './turret-tank.component.html',
	styleUrl: './turret-tank.component.scss',
})
export class TurretTankComponent implements OnDestroy {
	choices = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
	maxRounds = computed(() =>
		this.mix.active()
			? this.mix.roundSize()
			: this.settings.roundsFor("turret-tank"),
	);
	index = signal(0);
	submittedToMix = signal(false);
	score = signal(0);
	guess = signal<number | null>(null);
	result = signal("");
	locked = signal(false);
	/** Resultat du round en cours, pilote l'overlay de verdict cinematique. */
	protected verdict = signal<"correct" | "wrong" | "timeout" | null>(null);
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
	private scenarios = this.shuffleScenarios();
	scenario = computed(
		() => this.scenarios[this.index() % this.scenarios.length],
	);
	finished = computed(() => this.index() >= this.maxRounds());
	roundNumber = computed(() => this.index() + 1);
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
		this.startRoundTimer();
		this.room.onGameRestarted((payload) => {
			if (this.destroyed) return;
			if (payload.gameId === "turret-tank") this.restart();
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
		// Entree animee de chaque round (enigme qui punch, tuiles qui glissent).
		effect(() => {
			this.index();
			if (this.finished()) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".enigma"));
				slideUp(host.querySelector(".stat-chips"), { delay: 0.08 });
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
		this.result.set(
			`Temps ecoule : il tank ${this.scenario().answer} coups. ${this.scenario().note}`,
		);
		this.verdict.set("timeout");
		this.locked.set(true);
		this.audio.play("timeout");
		this.audio.play("reveal", { volume: 0.6 });
		this.scheduleAutoNext();
	}
	/** Enchaine automatiquement apres le verdict pour garder le rythme (le bouton Suivant reste dispo pour zapper). 5s : laisse le temps de lire la reponse ET la petite phrase avant de passer a la manche suivante. */
	private scheduleAutoNext() {
		clearTimeout(this.autoNextTimer);
		this.autoNextTimer = setTimeout(() => this.next(), 5000);
	}
	private shuffleScenarios() {
		const copy = [...SCENARIOS];
		for (let i = copy.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[copy[i], copy[j]] = [copy[j], copy[i]];
		}
		return copy;
	}
	splash(name: string) {
		return championLoadingUrl(name);
	}
	itemUrl(item: string) {
		return itemIconUrl(item);
	}
	selectGuess(n: number) {
		if (this.locked()) return;
		this.guess.set(n);
		this.audio.play("ui-click", { volume: 0.5 });
	}
	validate() {
		if (this.locked()) return;
		this.timer.stop();
		const host = this.hostElement.nativeElement;
		const stage = host.querySelector(".cine-stage") as HTMLElement | null;
		const d = Math.abs((this.guess() ?? 0) - this.scenario().answer);
		if (d === 0) {
			this.score.update((s) => s + 1);
			this.result.set(`Exact : ${this.scenario().answer} coups. ${this.scenario().note}`);
			this.verdict.set("correct");
			this.audio.play("correct");
			burstParticles(stage, {
				colors: ["#ffb347", "#ffd8a8", "#3fd67a"],
				count: 36,
			});
			floatScore(stage, "+1", "#ffb347");
			pulse(host.querySelector(".score-chip"));
		} else {
			this.result.set(`Rate : il tank ${this.scenario().answer} coups. ${this.scenario().note}`);
			this.verdict.set("wrong");
			this.audio.play("wrong");
			shake(stage);
		}
		this.audio.play("reveal", { volume: 0.6 });
		this.locked.set(true);
		this.scheduleAutoNext();
	}
	next() {
		if (!this.locked()) return;
		clearTimeout(this.autoNextTimer);
		this.audio.play("swap", { volume: 0.7 });
		this.index.update((i) => i + 1);
		if (this.finished()) {
			this.timer.stop();
			this.submitMix();
			return;
		}
		this.guess.set(null);
		this.result.set("");
		this.verdict.set(null);
		this.locked.set(false);
		this.startRoundTimer();
	}
	submitMix() {
		if (this.submittedToMix()) return;
		this.submittedToMix.set(true);
		this.room.submitMixSegment(
			this.score() * 10,
			`Turret Tank : ${this.score()}/${this.maxRounds()} estimations exactes.`,
		);
	}
	requestRestart() {
		if (!this.room.isHost()) return;
		this.room.restartGame("turret-tank");
	}
	restart() {
		this.scenarios = this.shuffleScenarios();
		clearTimeout(this.autoNextTimer);
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.guess.set(null);
		this.result.set("");
		this.verdict.set(null);
		this.locked.set(false);
		this.startRoundTimer();
	}
}
