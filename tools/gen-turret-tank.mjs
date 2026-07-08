// Générateur des scénarios Turret Tank — implémente la SPEC "coups de tour tankés".
// Sources : Data Dragon 15.24.1 (même version que lol-assets.ts du frontend).
// Chaque scénario a une réponse CIBLE : le script cherche la minute (dans la
// fenêtre du tier) qui la produit — le calcul reste strictement celui de la spec.

const DD = "https://ddragon.leagueoflegends.com/cdn/15.24.1/data/en_US";

// ---- Tours (Summoner's Rift), cf. SPEC ----
const TURRETS = {
	outer: { adStart: 182, adEnd: 350, tStart: 0, tCap: 14 },
	inner: { adStart: 187, adEnd: 427, tStart: 15, tCap: 30 },
	inhibitor: { adStart: 187, adEnd: 427, tStart: 30, tCap: 42 },
	nexus: { adStart: 165, adEnd: 405, tStart: 30, tCap: 42 },
};
// Fenêtres de minutes plausibles par tour (pour la recherche).
const WINDOWS = { outer: [2, 14], inner: [15, 30], inhibitor: [30, 42], nexus: [30, 42] };

function turretAd(turret, minute) {
	const { adStart, adEnd, tStart, tCap } = TURRETS[turret];
	if (minute <= tStart) return adStart;
	if (minute >= tCap) return adEnd;
	return adStart + ((adEnd - adStart) * (minute - tStart)) / (tCap - tStart);
}

// Formule officielle LoL de croissance des stats.
function statAtLevel(base, growth, level) {
	return base + growth * (level - 1) * (0.7025 + 0.0175 * (level - 1));
}

// Nombre de coups tankés : somme cumulée avec ramp +50%/tir (cap +150%), pen 30%.
function hitsToKill(hp, armor, turret, minute) {
	const ad = turretAd(turret, minute);
	const mult = 100 / (100 + armor * 0.7);
	let cumul = 0;
	for (let n = 1; n <= 60; n++) {
		const ramp = 1 + Math.min((n - 1) * 0.5, 1.5);
		cumul += ad * ramp * mult;
		if (cumul >= hp) return n;
	}
	return Infinity;
}

// ---- Ancres de validation (la SPEC exige ces résultats exacts) ----
function assertAnchor(name, got, want) {
	if (got !== want) {
		console.error(`ANCRE KO: ${name} -> ${got}, attendu ${want}`);
		process.exit(1);
	}
	console.log(`ancre OK: ${name} = ${got} coups`);
}
assertAnchor("Ahri niv1 600HP/21arm outer@3", hitsToKill(600, 21, "outer", 3), 3);
assertAnchor("Ahri 1859HP/117arm outer@16", hitsToKill(1859, 117, "outer", 16), 6);

// ---- Data Dragon ----
const champs = (await (await fetch(`${DD}/champion.json`)).json()).data;
const items = (await (await fetch(`${DD}/item.json`)).json()).data;

const CHAMP_IDS = {
	Malphite: "Malphite", Ornn: "Ornn", Rammus: "Rammus", "K'Sante": "KSante",
	Alistar: "Alistar", Shen: "Shen", Zac: "Zac", Braum: "Braum", Poppy: "Poppy",
	Leona: "Leona", Sion: "Sion", Volibear: "Volibear", Gragas: "Gragas",
	Sett: "Sett", Mordekaiser: "Mordekaiser", Nasus: "Nasus", Garen: "Garen",
	Aatrox: "Aatrox", Darius: "Darius", Wukong: "MonkeyKing", Pantheon: "Pantheon",
	Draven: "Draven", Thresh: "Thresh", Pyke: "Pyke", Yasuo: "Yasuo", Vayne: "Vayne",
	Lux: "Lux", Yuumi: "Yuumi", Jinx: "Jinx", "Kai'Sa": "Kaisa",
};

// Nom affiché -> id item (même table que lol-assets.ts::ITEM_KEYS)
const ITEM_IDS = {
	"Iceborn Gauntlet": "6662", Sunfire: "3068", "Plated Steelcaps": "3047",
	Moonstone: "6617", "Lucidity Boots": "3158", Stridebreaker: "6631",
	Sterak: "3053", "Ruby Crystal": "1028", Kraken: "6672", Guinsoo: "3124",
	Berserker: "3006", JakSho: "6665", "Frozen Heart": "3110", Tabi: "3047",
	Heartsteel: "3084", Rabadon: "3089",
};

function itemBonuses(name) {
	const id = ITEM_IDS[name];
	if (!id || !items[id]) {
		console.error(`ITEM INCONNU dans ddragon: ${name} (${id})`);
		process.exit(1);
	}
	const s = items[id].stats ?? {};
	return { hp: s.FlatHPPoolMod ?? 0, armor: s.FlatArmorMod ?? 0 };
}

// ---- Scénarios : (champ, niveau, items, tour, RÉPONSE CIBLE) ----
// Early = tour externe, mid = interne, late = inhibiteur/nexus.
const DEFS = [
	// --- Tier early (tour externe) : cibles 2-5 ---
	["Malphite", 6, ["Ruby Crystal"], "outer", 5],
	["Ornn", 7, ["Ruby Crystal"], "outer", 5],
	["Rammus", 8, ["Ruby Crystal"], "outer", 4],
	["K'Sante", 9, ["Ruby Crystal"], "outer", 5],
	["Alistar", 6, ["Ruby Crystal"], "outer", 4],
	["Shen", 7, ["Ruby Crystal"], "outer", 4],
	["Zac", 8, ["Ruby Crystal"], "outer", 5],
	["Braum", 9, ["Ruby Crystal"], "outer", 4],
	["Poppy", 5, ["Ruby Crystal"], "outer", 4],
	["Leona", 4, [], "outer", 3],
	["Sion", 6, ["Ruby Crystal"], "outer", 5],
	["Volibear", 7, ["Ruby Crystal"], "outer", 4],
	["Gragas", 8, ["Ruby Crystal"], "outer", 4],
	["Sett", 9, ["Ruby Crystal"], "outer", 5],
	["Mordekaiser", 5, ["Ruby Crystal"], "outer", 4],
	["Nasus", 4, ["Ruby Crystal"], "outer", 3],
	["Garen", 8, ["Ruby Crystal"], "outer", 4],
	["Aatrox", 9, ["Ruby Crystal"], "outer", 4],
	["Darius", 3, [], "outer", 3],
	["Wukong", 5, ["Ruby Crystal"], "outer", 3],
	["Pantheon", 7, ["Ruby Crystal"], "outer", 4],
	["Draven", 8, ["Berserker"], "outer", 4],
	["Thresh", 6, ["Ruby Crystal"], "outer", 4],
	["Pyke", 7, ["Ruby Crystal"], "outer", 4],
	["Yasuo", 6, ["Berserker"], "outer", 3],
	["Vayne", 3, [], "outer", 2],
	["Lux", 3, [], "outer", 2],
	["Yuumi", 5, [], "outer", 3],
	["Jinx", 7, ["Berserker"], "outer", 3],
	["Kai'Sa", 4, [], "outer", 3],
	// --- Tier mid (tour interne) : cibles 4-8 ---
	["Malphite", 10, ["Sunfire", "Plated Steelcaps"], "inner", 8],
	["Ornn", 11, ["Heartsteel", "Plated Steelcaps"], "inner", 8],
	["Rammus", 12, ["JakSho", "Plated Steelcaps"], "inner", 7],
	["K'Sante", 13, ["Iceborn Gauntlet", "Plated Steelcaps"], "inner", 8],
	["Alistar", 10, ["Sunfire", "Tabi"], "inner", 7],
	["Shen", 11, ["JakSho", "Plated Steelcaps"], "inner", 7],
	["Zac", 12, ["Frozen Heart", "Tabi"], "inner", 6],
	["Braum", 13, ["Plated Steelcaps", "JakSho"], "inner", 8],
	["Poppy", 10, ["Tabi", "Frozen Heart"], "inner", 6],
	["Leona", 11, ["Plated Steelcaps", "Frozen Heart"], "inner", 7],
	["Sion", 10, ["Sterak", "Plated Steelcaps"], "inner", 6],
	["Volibear", 11, ["Stridebreaker", "Tabi"], "inner", 6],
	["Gragas", 12, ["Sterak", "Sunfire"], "inner", 7],
	["Sett", 13, ["Stridebreaker", "Sterak"], "inner", 7],
	["Mordekaiser", 10, ["Sterak", "Sunfire"], "inner", 7],
	["Nasus", 11, ["Sunfire", "Tabi"], "inner", 6],
	["Garen", 12, ["Stridebreaker", "Plated Steelcaps"], "inner", 6],
	["Aatrox", 13, ["Stridebreaker", "Sterak"], "inner", 6],
	["Darius", 10, ["Stridebreaker", "Tabi"], "inner", 5],
	["Wukong", 11, ["Stridebreaker", "Sterak"], "inner", 6],
	["Pantheon", 12, ["Stridebreaker", "Tabi"], "inner", 5],
	["Draven", 13, ["Kraken", "Berserker"], "inner", 4],
	["Thresh", 10, ["Frozen Heart", "Plated Steelcaps"], "inner", 5],
	["Pyke", 11, ["Tabi"], "inner", 4],
	["Yasuo", 12, ["Kraken", "Berserker"], "inner", 4],
	["Vayne", 10, ["Kraken", "Berserker"], "inner", 4],
	["Lux", 11, ["Rabadon", "Lucidity Boots"], "inner", 4],
	["Yuumi", 12, ["Moonstone", "Lucidity Boots"], "inner", 4],
	["Jinx", 13, ["Kraken", "Berserker"], "inner", 4],
	["Kai'Sa", 10, ["Guinsoo", "Berserker"], "inner", 4],
	// --- Tier late (inhibiteur/nexus) : cibles 5-10 ---
	["Malphite", 14, ["Sunfire", "Frozen Heart", "Plated Steelcaps"], "inhibitor", 10],
	["Ornn", 15, ["Heartsteel", "Sunfire", "JakSho"], "nexus", 10],
	["Rammus", 16, ["JakSho", "Frozen Heart", "Plated Steelcaps"], "nexus", 9],
	["K'Sante", 17, ["Iceborn Gauntlet", "JakSho"], "nexus", 10],
	["Alistar", 18, ["Sunfire", "Frozen Heart", "Tabi"], "nexus", 10],
	["Shen", 14, ["JakSho", "Sunfire", "Plated Steelcaps"], "inhibitor", 10],
	["Zac", 15, ["Frozen Heart", "Sunfire", "Heartsteel"], "nexus", 10],
	["Braum", 16, ["Plated Steelcaps", "Sunfire", "Frozen Heart"], "nexus", 9],
	["Poppy", 17, ["Tabi", "JakSho", "Sunfire"], "nexus", 10],
	["Leona", 18, ["Plated Steelcaps", "Frozen Heart", "JakSho"], "nexus", 9],
	["Sion", 14, ["Sterak", "Sunfire", "Plated Steelcaps"], "inhibitor", 9],
	["Volibear", 15, ["Stridebreaker", "Sterak", "Tabi"], "inhibitor", 8],
	["Gragas", 16, ["Sterak", "Sunfire", "Plated Steelcaps"], "nexus", 9],
	["Sett", 17, ["Stridebreaker", "Sterak", "Tabi"], "nexus", 8],
	["Mordekaiser", 18, ["Sterak", "Heartsteel", "Sunfire"], "nexus", 10],
	["Nasus", 14, ["Sunfire", "Heartsteel", "Plated Steelcaps"], "inhibitor", 10],
	["Garen", 15, ["Stridebreaker", "Sterak", "Plated Steelcaps"], "inhibitor", 8],
	["Aatrox", 16, ["Stridebreaker", "Sterak", "Heartsteel"], "nexus", 9],
	["Darius", 14, ["Stridebreaker", "Sterak", "Tabi"], "inhibitor", 8],
	["Wukong", 15, ["Stridebreaker", "Sterak", "Plated Steelcaps"], "inhibitor", 7],
	["Pantheon", 16, ["Stridebreaker", "Sterak", "Plated Steelcaps"], "nexus", 8],
	["Draven", 17, ["Kraken", "Sterak", "Berserker"], "nexus", 6],
	["Thresh", 14, ["Frozen Heart", "Plated Steelcaps", "JakSho"], "inhibitor", 8],
	["Pyke", 15, ["Tabi", "Frozen Heart"], "inhibitor", 7],
	["Yasuo", 16, ["Kraken", "Guinsoo", "Berserker"], "nexus", 5],
	["Vayne", 14, ["Kraken", "Guinsoo", "Berserker"], "inhibitor", 5],
	["Lux", 15, ["Rabadon", "Lucidity Boots", "Ruby Crystal"], "inhibitor", 5],
	["Yuumi", 16, ["Moonstone", "Lucidity Boots", "Ruby Crystal"], "nexus", 5],
	["Jinx", 17, ["Kraken", "Guinsoo", "Berserker"], "nexus", 6],
	["Kai'Sa", 18, ["Kraken", "Guinsoo", "Berserker"], "nexus", 6],
];

const results = [];
const distribution = {};
const failures = [];
for (const [champ, level, build, turret, target] of DEFS) {
	const id = CHAMP_IDS[champ];
	const stats = champs[id]?.stats;
	if (!stats) {
		console.error(`CHAMPION INCONNU: ${champ} (${id})`);
		process.exit(1);
	}
	let hp = statAtLevel(stats.hp, stats.hpperlevel, level);
	let armor = statAtLevel(stats.armor, stats.armorperlevel, level);
	for (const item of build) {
		const b = itemBonuses(item);
		// Passif de Pyke : les PV bonus (items) sont convertis, jamais appliqués.
		if (champ !== "Pyke") hp += b.hp;
		armor += b.armor;
	}
	// Le joueur calcule à partir des valeurs AFFICHÉES : on arrondit d'abord,
	// la réponse est ensuite déduite de ces entiers-là (cohérence garantie).
	hp = Math.round(hp);
	armor = Math.round(armor);

	// Recherche de la minute (entière) qui donne la réponse cible.
	const [minT, maxT] = WINDOWS[turret];
	const matching = [];
	const seen = new Map();
	for (let t = minT; t <= maxT; t++) {
		const a = hitsToKill(hp, armor, turret, t);
		seen.set(t, a);
		if (a === target) matching.push(t);
	}
	if (!matching.length) {
		failures.push(`${champ} niv${level} ${turret} cible ${target} IMPOSSIBLE — atteignable: ${[...new Set(seen.values())].join(",")} (${hp} HP / ${armor} arm)`);
		continue;
	}
	const minute = matching[Math.floor(matching.length / 2)];
	distribution[target] = (distribution[target] ?? 0) + 1;
	results.push({ champ, level, hp, armor, items: build, turret, minute, answer: target });
}

if (failures.length) {
	console.error("\n--- CIBLES IMPOSSIBLES ---");
	for (const f of failures) console.error(f);
	process.exit(1);
}

console.log("\n--- distribution des réponses ---");
for (const k of Object.keys(distribution).sort((a, b) => a - b)) console.log(`${String(k).padStart(2)} coups : ${"#".repeat(distribution[k])} (${distribution[k]})`);

// Sortie TypeScript
import { writeFileSync } from "fs";
const lines = results.map((r) =>
	`\t{ champ: ${JSON.stringify(r.champ)}, level: ${r.level}, hp: ${r.hp}, armor: ${r.armor}, items: ${JSON.stringify(r.items)}, turret: ${JSON.stringify(r.turret)}, minute: ${r.minute}, answer: ${r.answer} },`,
);
writeFileSync(new URL("./scenarios-out.ts", import.meta.url), lines.join("\n") + "\n");
console.log(`\n${results.length} scénarios écrits dans scenarios-out.ts`);
