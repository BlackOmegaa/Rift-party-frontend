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
	hp: number;
	armor: number;
	items: string[];
	answer: number;
	note: string;
}
const SCENARIOS: Scenario[] = [
	{
		champ: "Malphite",
		level: 6,
		hp: 1540,
		armor: 70,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Unstoppable Force sur la tour, dommage que ça ne marche pas dans l'autre sens.",
	},
	{
		champ: "Ornn",
		level: 7,
		hp: 1500,
		armor: 75,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Il forge ses items, la tour forge ses dégâts. Douloureux pour tout le monde.",
	},
	{
		champ: "Rammus",
		level: 8,
		hp: 1460,
		armor: 80,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Ok tank Rammus, mais si le comeback ne suit jamais, ça sert à quoi ?",
	},
	{
		champ: "K'Sante",
		level: 9,
		hp: 2100,
		armor: 75,
		items: ["Ruby Crystal"],
		answer: 4,
		note: "Ultimate qui repousse tout, sauf les regrets du draft.",
	},
	{
		champ: "Alistar",
		level: 6,
		hp: 1590,
		armor: 65,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Il headbutt la tour, la tour ne rigole pas.",
	},
	{
		champ: "Shen",
		level: 7,
		hp: 1560,
		armor: 68,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Un vrai Shen protège sa botlane, un faux Shen farm en solo en tapant la tour.",
	},
	{
		champ: "Zac",
		level: 8,
		hp: 1530,
		armor: 72,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Il rebondit sur la tour, la tour ne rebondit pas sur lui. Dommage.",
	},
	{
		champ: "Braum",
		level: 9,
		hp: 1590,
		armor: 65,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Le bouclier arrête tout, sauf les remarques du chat.",
	},
	{
		champ: "Poppy",
		level: 6,
		hp: 1640,
		armor: 60,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Elle attend son moment. La tour n'attend rien.",
	},
	{
		champ: "Leona",
		level: 7,
		hp: 1020,
		armor: 55,
		items: ["Ruby Crystal"],
		answer: 2,
		note: "Elle engage, la tour tape, et l'ADC est déjà mort avant l'impact.",
	},
	{
		champ: "Sion",
		level: 6,
		hp: 1690,
		armor: 55,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Il refuse de mourir tout de suite, la tour s'en fiche et retape derrière.",
	},
	{
		champ: "Volibear",
		level: 7,
		hp: 1660,
		armor: 58,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Il plonge du ciel sur la tour. La tour n'apprécie pas la surprise.",
	},
	{
		champ: "Gragas",
		level: 8,
		hp: 1730,
		armor: 52,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Un tonneau, une explosion, et un top laner qui recule d'un pas trop tard.",
	},
	{
		champ: "Sett",
		level: 9,
		hp: 1750,
		armor: 50,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Les pecs tank, la tour ne respecte pas les pecs.",
	},
	{
		champ: "Mordekaiser",
		level: 6,
		hp: 1700,
		armor: 54,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Il t'emmène dans sa réalité, la tour reste dans la vraie.",
	},
	{
		champ: "Nasus",
		level: 7,
		hp: 1090,
		armor: 45,
		items: ["Ruby Crystal"],
		answer: 2,
		note: "Plus il stack, plus la tour a l'air ridicule. Jusqu'à un certain point.",
	},
	{
		champ: "Garen",
		level: 8,
		hp: 1720,
		armor: 53,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Silence, spin, et une tour qui continue de parler quand même.",
	},
	{
		champ: "Aatrox",
		level: 9,
		hp: 1770,
		armor: 48,
		items: ["Ruby Crystal"],
		answer: 3,
		note: "Il revient d'entre les morts une fois. La tour, elle, ne s'arrête jamais.",
	},
	{
		champ: "Darius",
		level: 6,
		hp: 1110,
		armor: 42,
		items: ["Ruby Crystal"],
		answer: 2,
		note: "Cinq stacks de saignement plus tard, c'est la tour qui prend le crédit du kill.",
	},
	{
		champ: "Wukong",
		level: 7,
		hp: 1120,
		armor: 40,
		items: ["Ruby Crystal"],
		answer: 2,
		note: "Clone posé, invisible, et toujours cette tour qui tape le vrai par hasard.",
	},
	{
		champ: "Pantheon",
		level: 8,
		hp: 1090,
		armor: 44,
		items: ["Ruby Crystal"],
		answer: 2,
		note: "Il plonge depuis la stratosphère. La tour l'attendait déjà en dessous.",
	},
	{
		champ: "Draven",
		level: 9,
		hp: 1170,
		armor: 35,
		items: ["Berserker"],
		answer: 2,
		note: "Les haches tournent, la confiance monte, la tour n'est pas impressionnée.",
	},
	{
		champ: "Thresh",
		level: 6,
		hp: 1120,
		armor: 40,
		items: ["Ruby Crystal"],
		answer: 2,
		note: "La lanterne sauve tout le monde, sauf lui-même sous la tour.",
	},
	{
		champ: "Pyke",
		level: 7,
		hp: 390,
		armor: 35,
		items: ["Ruby Crystal"],
		answer: 1,
		note: "Passif discount sur la vie max, la tour ne fait pas de rabais.",
	},
	{
		champ: "Yasuo",
		level: 8,
		hp: 1210,
		armor: 30,
		items: ["Berserker"],
		answer: 2,
		note: "Le bouclier tient tant qu'il court, la tour tire plus vite qu'il ne dash.",
	},
	{
		champ: "Vayne",
		level: 6,
		hp: 420,
		armor: 25,
		items: ["Berserker"],
		answer: 1,
		note: "Invisible en combat, très visible pour la tour.",
	},
	{
		champ: "Lux",
		level: 7,
		hp: 430,
		armor: 22,
		items: ["Lucidity Boots"],
		answer: 1,
		note: "Zéro armure, une seule tour, un seul aller simple.",
	},
	{
		champ: "Yuumi",
		level: 8,
		hp: 440,
		armor: 20,
		items: ["Lucidity Boots"],
		answer: 1,
		note: "Détachée, seule, et face à une tour qui ne demande pas la permission.",
	},
	{
		champ: "Jinx",
		level: 9,
		hp: 1230,
		armor: 28,
		items: ["Berserker"],
		answer: 2,
		note: "Elle rigole du danger jusqu'à ce que le danger tape en retour.",
	},
	{
		champ: "Kai'Sa",
		level: 6,
		hp: 420,
		armor: 24,
		items: ["Berserker"],
		answer: 1,
		note: "Plus elle évolue, plus elle croit être en sécurité. Elle ne l'est pas.",
	},
	{
		champ: "Malphite",
		level: 10,
		hp: 2220,
		armor: 160,
		items: ["Sunfire", "Plated Steelcaps"],
		answer: 6,
		note: "Unstoppable Force sur la tour, dommage que ça ne marche pas dans l'autre sens.",
	},
	{
		champ: "Ornn",
		level: 11,
		hp: 2180,
		armor: 165,
		items: ["Heartsteel", "Plated Steelcaps"],
		answer: 6,
		note: "Il forge ses items, la tour forge ses dégâts. Douloureux pour tout le monde.",
	},
	{
		champ: "Rammus",
		level: 12,
		hp: 2140,
		armor: 170,
		items: ["JakSho", "Plated Steelcaps"],
		answer: 6,
		note: "Ok tank Rammus, mais si le comeback ne suit jamais, ça sert à quoi ?",
	},
	{
		champ: "K'Sante",
		level: 13,
		hp: 2530,
		armor: 170,
		items: ["Iceborn Gauntlet", "Plated Steelcaps"],
		answer: 7,
		note: "Ultimate qui repousse tout, sauf les regrets du draft.",
	},
	{
		champ: "Alistar",
		level: 10,
		hp: 2260,
		armor: 155,
		items: ["Sunfire", "Tabi"],
		answer: 6,
		note: "Il headbutt la tour, la tour ne rigole pas.",
	},
	{
		champ: "Shen",
		level: 11,
		hp: 2240,
		armor: 158,
		items: ["JakSho", "Plated Steelcaps"],
		answer: 6,
		note: "Un vrai Shen protège sa botlane, un faux Shen farm en solo en tapant la tour.",
	},
	{
		champ: "Zac",
		level: 12,
		hp: 2200,
		armor: 162,
		items: ["Frozen Heart", "Tabi"],
		answer: 6,
		note: "Il rebondit sur la tour, la tour ne rebondit pas sur lui. Dommage.",
	},
	{
		champ: "Braum",
		level: 13,
		hp: 2310,
		armor: 150,
		items: ["Plated Steelcaps", "JakSho"],
		answer: 6,
		note: "Le bouclier arrête tout, sauf les remarques du chat.",
	},
	{
		champ: "Poppy",
		level: 10,
		hp: 2050,
		armor: 130,
		items: ["Tabi", "Frozen Heart"],
		answer: 5,
		note: "Elle attend son moment. La tour n'attend rien.",
	},
	{
		champ: "Leona",
		level: 11,
		hp: 1970,
		armor: 140,
		items: ["Plated Steelcaps", "Frozen Heart"],
		answer: 5,
		note: "Elle engage, la tour tape, et l'ADC est déjà mort avant l'impact.",
	},
	{
		champ: "Sion",
		level: 10,
		hp: 2100,
		armor: 125,
		items: ["Sterak", "Plated Steelcaps"],
		answer: 5,
		note: "Il refuse de mourir tout de suite, la tour s'en fiche et retape derrière.",
	},
	{
		champ: "Volibear",
		level: 11,
		hp: 2040,
		armor: 128,
		items: ["Stridebreaker", "Tabi"],
		answer: 5,
		note: "Il plonge du ciel sur la tour. La tour n'apprécie pas la surprise.",
	},
	{
		champ: "Gragas",
		level: 12,
		hp: 2130,
		armor: 122,
		items: ["Sterak", "Sunfire"],
		answer: 5,
		note: "Un tonneau, une explosion, et un top laner qui recule d'un pas trop tard.",
	},
	{
		champ: "Sett",
		level: 13,
		hp: 2200,
		armor: 115,
		items: ["Stridebreaker", "Sterak"],
		answer: 5,
		note: "Les pecs tank, la tour ne respecte pas les pecs.",
	},
	{
		champ: "Mordekaiser",
		level: 10,
		hp: 2110,
		armor: 124,
		items: ["Sterak", "Sunfire"],
		answer: 5,
		note: "Il t'emmène dans sa réalité, la tour reste dans la vraie.",
	},
	{
		champ: "Nasus",
		level: 11,
		hp: 1840,
		armor: 100,
		items: ["Sunfire", "Tabi"],
		answer: 4,
		note: "Plus il stack, plus la tour a l'air ridicule. Jusqu'à un certain point.",
	},
	{
		champ: "Garen",
		level: 12,
		hp: 2170,
		armor: 118,
		items: ["Stridebreaker", "Plated Steelcaps"],
		answer: 5,
		note: "Silence, spin, et une tour qui continue de parler quand même.",
	},
	{
		champ: "Aatrox",
		level: 13,
		hp: 2230,
		armor: 112,
		items: ["Stridebreaker", "Sterak"],
		answer: 5,
		note: "Il revient d'entre les morts une fois. La tour, elle, ne s'arrête jamais.",
	},
	{
		champ: "Darius",
		level: 10,
		hp: 1990,
		armor: 85,
		items: ["Stridebreaker", "Tabi"],
		answer: 4,
		note: "Cinq stacks de saignement plus tard, c'est la tour qui prend le crédit du kill.",
	},
	{
		champ: "Wukong",
		level: 11,
		hp: 2020,
		armor: 82,
		items: ["Stridebreaker", "Sterak"],
		answer: 4,
		note: "Clone posé, invisible, et toujours cette tour qui tape le vrai par hasard.",
	},
	{
		champ: "Pantheon",
		level: 12,
		hp: 1960,
		armor: 88,
		items: ["Stridebreaker", "Tabi"],
		answer: 4,
		note: "Il plonge depuis la stratosphère. La tour l'attendait déjà en dessous.",
	},
	{
		champ: "Draven",
		level: 13,
		hp: 1750,
		armor: 50,
		items: ["Kraken", "Berserker"],
		answer: 3,
		note: "Les haches tournent, la confiance monte, la tour n'est pas impressionnée.",
	},
	{
		champ: "Thresh",
		level: 10,
		hp: 2230,
		armor: 65,
		items: ["Frozen Heart", "Plated Steelcaps"],
		answer: 4,
		note: "La lanterne sauve tout le monde, sauf lui-même sous la tour.",
	},
	{
		champ: "Pyke",
		level: 11,
		hp: 1090,
		armor: 45,
		items: ["Ruby Crystal", "Tabi"],
		answer: 2,
		note: "Passif discount sur la vie max, la tour ne fait pas de rabais.",
	},
	{
		champ: "Yasuo",
		level: 12,
		hp: 1940,
		armor: 35,
		items: ["Kraken", "Berserker"],
		answer: 3,
		note: "Le bouclier tient tant qu'il court, la tour tire plus vite qu'il ne dash.",
	},
	{
		champ: "Vayne",
		level: 10,
		hp: 1210,
		armor: 30,
		items: ["Kraken", "Berserker"],
		answer: 2,
		note: "Invisible en combat, très visible pour la tour.",
	},
	{
		champ: "Lux",
		level: 11,
		hp: 1230,
		armor: 28,
		items: ["Rabadon", "Lucidity Boots"],
		answer: 2,
		note: "Zéro armure, une seule tour, un seul aller simple.",
	},
	{
		champ: "Yuumi",
		level: 12,
		hp: 700,
		armor: 25,
		items: ["Moonstone", "Lucidity Boots"],
		answer: 1,
		note: "Détachée, seule, et face à une tour qui ne demande pas la permission.",
	},
	{
		champ: "Jinx",
		level: 13,
		hp: 1950,
		armor: 38,
		items: ["Kraken", "Berserker"],
		answer: 3,
		note: "Elle rigole du danger jusqu'à ce que le danger tape en retour.",
	},
	{
		champ: "Kai'Sa",
		level: 10,
		hp: 1210,
		armor: 30,
		items: ["Guinsoo", "Berserker"],
		answer: 2,
		note: "Plus elle évolue, plus elle croit être en sécurité. Elle ne l'est pas.",
	},
	{
		champ: "Malphite",
		level: 14,
		hp: 2620,
		armor: 240,
		items: ["Sunfire", "Frozen Heart", "Plated Steelcaps"],
		answer: 9,
		note: "Unstoppable Force sur la tour, dommage que ça ne marche pas dans l'autre sens.",
	},
	{
		champ: "Ornn",
		level: 15,
		hp: 2850,
		armor: 250,
		items: ["Heartsteel", "Sunfire", "JakSho"],
		answer: 10,
		note: "Il forge ses items, la tour forge ses dégâts. Douloureux pour tout le monde.",
	},
	{
		champ: "Rammus",
		level: 16,
		hp: 2590,
		armor: 245,
		items: ["JakSho", "Frozen Heart", "Plated Steelcaps"],
		answer: 9,
		note: "Ok tank Rammus, mais si le comeback ne suit jamais, ça sert à quoi ?",
	},
	{
		champ: "K'Sante",
		level: 17,
		hp: 2770,
		armor: 260,
		items: ["Iceborn Gauntlet", "Heartsteel", "JakSho"],
		answer: 10,
		note: "Ultimate qui repousse tout, sauf les regrets du draft.",
	},
	{
		champ: "Alistar",
		level: 18,
		hp: 2810,
		armor: 255,
		items: ["Sunfire", "Frozen Heart", "Tabi"],
		answer: 10,
		note: "Il headbutt la tour, la tour ne rigole pas.",
	},
	{
		champ: "Shen",
		level: 14,
		hp: 2660,
		armor: 235,
		items: ["JakSho", "Sunfire", "Plated Steelcaps"],
		answer: 9,
		note: "Un vrai Shen protège sa botlane, un faux Shen farm en solo en tapant la tour.",
	},
	{
		champ: "Zac",
		level: 15,
		hp: 2650,
		armor: 238,
		items: ["Frozen Heart", "Sunfire", "Heartsteel"],
		answer: 9,
		note: "Il rebondit sur la tour, la tour ne rebondit pas sur lui. Dommage.",
	},
	{
		champ: "Braum",
		level: 16,
		hp: 2570,
		armor: 230,
		items: ["Plated Steelcaps", "Sunfire", "Frozen Heart"],
		answer: 9,
		note: "Le bouclier arrête tout, sauf les remarques du chat.",
	},
	{
		champ: "Poppy",
		level: 17,
		hp: 2620,
		armor: 200,
		items: ["Tabi", "JakSho", "Sunfire"],
		answer: 8,
		note: "Elle attend son moment. La tour n'attend rien.",
	},
	{
		champ: "Leona",
		level: 18,
		hp: 2540,
		armor: 210,
		items: ["Plated Steelcaps", "Frozen Heart", "JakSho"],
		answer: 8,
		note: "Elle engage, la tour tape, et l'ADC est déjà mort avant l'impact.",
	},
	{
		champ: "Sion",
		level: 14,
		hp: 2670,
		armor: 195,
		items: ["Sterak", "Sunfire", "Plated Steelcaps"],
		answer: 8,
		note: "Il refuse de mourir tout de suite, la tour s'en fiche et retape derrière.",
	},
	{
		champ: "Volibear",
		level: 15,
		hp: 2640,
		armor: 198,
		items: ["Stridebreaker", "Sterak", "Tabi"],
		answer: 8,
		note: "Il plonge du ciel sur la tour. La tour n'apprécie pas la surprise.",
	},
	{
		champ: "Gragas",
		level: 16,
		hp: 2700,
		armor: 192,
		items: ["Sterak", "Sunfire", "Plated Steelcaps"],
		answer: 8,
		note: "Un tonneau, une explosion, et un top laner qui recule d'un pas trop tard.",
	},
	{
		champ: "Sett",
		level: 17,
		hp: 2480,
		armor: 175,
		items: ["Stridebreaker", "Sterak", "Tabi"],
		answer: 7,
		note: "Les pecs tank, la tour ne respecte pas les pecs.",
	},
	{
		champ: "Mordekaiser",
		level: 18,
		hp: 2690,
		armor: 193,
		items: ["Sterak", "Heartsteel", "Sunfire"],
		answer: 8,
		note: "Il t'emmène dans sa réalité, la tour reste dans la vraie.",
	},
	{
		champ: "Nasus",
		level: 14,
		hp: 2720,
		armor: 190,
		items: ["Sunfire", "Heartsteel", "Plated Steelcaps"],
		answer: 8,
		note: "Plus il stack, plus la tour a l'air ridicule. Jusqu'à un certain point.",
	},
	{
		champ: "Garen",
		level: 15,
		hp: 2450,
		armor: 178,
		items: ["Stridebreaker", "Sterak", "Plated Steelcaps"],
		answer: 7,
		note: "Silence, spin, et une tour qui continue de parler quand même.",
	},
	{
		champ: "Aatrox",
		level: 16,
		hp: 2530,
		armor: 170,
		items: ["Stridebreaker", "Sterak", "Heartsteel"],
		answer: 7,
		note: "Il revient d'entre les morts une fois. La tour, elle, ne s'arrête jamais.",
	},
	{
		champ: "Darius",
		level: 14,
		hp: 2410,
		armor: 140,
		items: ["Stridebreaker", "Sterak", "Tabi"],
		answer: 6,
		note: "Cinq stacks de saignement plus tard, c'est la tour qui prend le crédit du kill.",
	},
	{
		champ: "Wukong",
		level: 15,
		hp: 2460,
		armor: 135,
		items: ["Stridebreaker", "Sterak", "Plated Steelcaps"],
		answer: 6,
		note: "Clone posé, invisible, et toujours cette tour qui tape le vrai par hasard.",
	},
	{
		champ: "Pantheon",
		level: 16,
		hp: 2360,
		armor: 145,
		items: ["Stridebreaker", "Sterak", "Plated Steelcaps"],
		answer: 6,
		note: "Il plonge depuis la stratosphère. La tour l'attendait déjà en dessous.",
	},
	{
		champ: "Draven",
		level: 17,
		hp: 2860,
		armor: 65,
		items: ["Kraken", "Sterak", "Berserker"],
		answer: 5,
		note: "Les haches tournent, la confiance monte, la tour n'est pas impressionnée.",
	},
	{
		champ: "Thresh",
		level: 14,
		hp: 2420,
		armor: 95,
		items: ["Frozen Heart", "Plated Steelcaps", "JakSho"],
		answer: 5,
		note: "La lanterne sauve tout le monde, sauf lui-même sous la tour.",
	},
	{
		champ: "Pyke",
		level: 15,
		hp: 2300,
		armor: 60,
		items: ["Ruby Crystal", "Tabi", "Frozen Heart"],
		answer: 4,
		note: "Passif discount sur la vie max, la tour ne fait pas de rabais.",
	},
	{
		champ: "Yasuo",
		level: 16,
		hp: 2530,
		armor: 45,
		items: ["Kraken", "Guinsoo", "Berserker"],
		answer: 4,
		note: "Le bouclier tient tant qu'il court, la tour tire plus vite qu'il ne dash.",
	},
	{
		champ: "Vayne",
		level: 14,
		hp: 1880,
		armor: 40,
		items: ["Kraken", "Guinsoo", "Berserker"],
		answer: 3,
		note: "Invisible en combat, très visible pour la tour.",
	},
	{
		champ: "Lux",
		level: 15,
		hp: 1940,
		armor: 35,
		items: ["Rabadon", "Lucidity Boots", "Ruby Crystal"],
		answer: 3,
		note: "Zéro armure, une seule tour, un seul aller simple.",
	},
	{
		champ: "Yuumi",
		level: 16,
		hp: 1170,
		armor: 35,
		items: ["Moonstone", "Lucidity Boots", "Ruby Crystal"],
		answer: 2,
		note: "Détachée, seule, et face à une tour qui ne demande pas la permission.",
	},
	{
		champ: "Jinx",
		level: 17,
		hp: 2550,
		armor: 48,
		items: ["Kraken", "Guinsoo", "Berserker"],
		answer: 4,
		note: "Elle rigole du danger jusqu'à ce que le danger tape en retour.",
	},
	{
		champ: "Kai'Sa",
		level: 18,
		hp: 1900,
		armor: 38,
		items: ["Kraken", "Guinsoo", "Berserker"],
		answer: 3,
		note: "Plus elle évolue, plus elle croit être en sécurité. Elle ne l'est pas.",
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
	/** Enchaine automatiquement apres le verdict pour garder le rythme (le bouton Suivant reste dispo pour zapper). */
	private scheduleAutoNext() {
		clearTimeout(this.autoNextTimer);
		this.autoNextTimer = setTimeout(() => this.next(), 3200);
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
