import { readFileSync, writeFileSync } from "fs";

const KEY = readFileSync(new URL("./.openai-key", import.meta.url), "utf8").trim();

// Extrait la liste des champions depuis le composant (answer: "...").
const comp = readFileSync(
	"E:/rift-party-v11-real-v1 - Copie/frontend/src/app/mini-games/guess-champion/guess-champion.component.ts",
	"utf8",
);
const allChamps = [...comp.matchAll(/answer:\s*"([^"]+)"/g)].map((m) => m[1]);

// Mode : "sample" (6 champions variés) ou "all".
const mode = process.argv[2] === "all" ? "all" : "sample";
const SAMPLE = ["Aatrox", "Ahri", "Thresh", "Teemo", "Jinx", "Malphite"];
const champs = mode === "all" ? allChamps : SAMPLE;

const SYSTEM =
	"Tu génères des indices pour un jeu \"devine le champion de League of Legends\". " +
	"Pour le champion donné, écris EXACTEMENT 5 indices en français, du plus VAGUE et retors " +
	"(indice 1) au plus révélateur (indice 5).\n\n" +
	"STYLE OBLIGATOIRE : phrases nominales COURTES et punchy, sèches. 3 à 7 mots max. " +
	"JAMAIS de tournures du type \"Ce champion est...\", \"Il est connu pour...\", \"Souvent associé à...\". " +
	"Des fragments qui claquent.\n\n" +
	"Règles :\n" +
	"- NE JAMAIS écrire le nom du champion.\n" +
	"- NE JAMAIS écrire le nom exact de ses sorts ou de son ultime.\n" +
	"- Indices 1 et 2 : vraiment cryptiques (lore, silhouette, ambiance) — SANS objet/arme signature unique ni région.\n" +
	"- Indices 3-4-5 : de plus en plus précis, mais jamais le nom.\n" +
	"- EXACTITUDE ABSOLUE : région, faction, rôle, lore corrects (ne pas confondre Zaun/Piltover, héros/vilain, etc.).\n" +
	"- Français grammaticalement correct et naturel (pas de fragment absurde).\n\n" +
	"Exemple pour Aatrox : {\"hints\":[\"Guerre oubliée, camp perdu.\",\"Jadis lumière, aujourd'hui haine.\",\"Colosse ailé de ténèbres.\",\"Se soigne en frappant.\",\"Épée aussi grande que lui.\"]}\n\n" +
	"Réponds UNIQUEMENT en JSON strict : {\"hints\":[\"i1\",\"i2\",\"i3\",\"i4\",\"i5\"]}";

async function genOne(name) {
	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
		body: JSON.stringify({
			model: "gpt-4o",
			messages: [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: `Champion : ${name}` },
			],
			temperature: 0.9,
			response_format: { type: "json_object" },
		}),
	});
	if (!res.ok) throw new Error(`${name}: ${res.status} ${(await res.text()).slice(0, 150)}`);
	const data = await res.json();
	const parsed = JSON.parse(data.choices[0].message.content);
	const hints = parsed.hints;
	if (!Array.isArray(hints) || hints.length !== 5) throw new Error(`${name}: hints invalides`);
	// Garde-fou : rejette un indice qui contiendrait le nom du champion.
	const lname = name.toLowerCase();
	const leak = hints.find((h) => h.toLowerCase().includes(lname));
	if (leak) console.warn(`⚠ ${name}: indice cite le nom -> "${leak}"`);
	return hints;
}

// Concurrence limitée.
const out = {};
const CONC = 6;
const queue = [...champs];
async function worker() {
	while (queue.length) {
		const name = queue.shift();
		try {
			out[name] = await genOne(name);
			process.stdout.write(`✓ ${name}\n`);
		} catch (e) {
			console.error("✗", e.message);
			queue.push(name); // retente une fois en fin de file
			if ((out.__retries = (out.__retries ?? 0) + 1) > champs.length) break;
		}
	}
}
await Promise.all(Array.from({ length: CONC }, worker));
delete out.__retries;

const file = new URL(mode === "all" ? "./guess-hints-all.json" : "./guess-hints-sample.json", import.meta.url);
writeFileSync(file, JSON.stringify(out, null, 2));
console.log(`\n${Object.keys(out).length} champions générés -> ${file.pathname.split("/").pop()}`);

// Affiche l'échantillon lisible.
if (mode === "sample") {
	for (const [name, hints] of Object.entries(out)) {
		console.log(`\n=== ${name} ===`);
		hints.forEach((h, i) => console.log(`  ${i + 1}. ${h}`));
	}
}
