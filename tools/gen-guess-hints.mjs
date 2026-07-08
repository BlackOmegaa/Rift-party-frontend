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
const SAMPLE = ["Aatrox", "Ahri", "Thresh", "Teemo", "Jinx", "Malphite", "Lux", "Darius", "Yuumi", "Kaisa"];
const champs = mode === "all" ? allChamps : SAMPLE;

const SYSTEM =
	"Tu génères des indices pour un jeu \"devine le champion de League of Legends\". " +
	"Écris EXACTEMENT 5 indices en français, du plus DUR (indice 1) au plus FACILE (indice 5).\n\n" +
	"IMPÉRATIF DE FORMAT : chaque indice est TRÈS COURT — 2 à 6 mots maximum. " +
	"Des phrases nominales, sèches et CLAIRES (pas de métaphore, pas de poésie). " +
	"Un joueur doit comprendre l'indice immédiatement.\n\n" +
	"PROGRESSION (le plus IMPORTANT) : l'indice 1 doit correspondre à BEAUCOUP de champions " +
	"(uniquement le rôle/la classe, AUCUN trait unique qui identifie). Chaque indice suivant RESTREINT. " +
	"Le trait le plus reconnaissable (espèce, relation, arme signature) arrive SEULEMENT à l'indice 5. " +
	"NE METS JAMAIS l'espèce/le détail identifiant (renard, Darkin, taureau, momie...) avant l'indice 4.\n" +
	"- Indice 1 : rôle/classe SEUL, très large. Ex: \"Mage à distance.\", \"Combattant au corps à corps.\", \"Support tank.\", \"Assassin furtif.\"\n" +
	"- Indice 2 : un trait de style/gameplay encore partagé par plusieurs. Ex: \"Très mobile.\", \"Inflige du poison.\", \"Excelle en duel.\"\n" +
	"- Indice 3 : une mécanique plus spécifique. Ex: \"Bloque les projectiles.\", \"Devient invisible.\", \"Se soigne en frappant.\"\n" +
	"- Indice 4 : un trait distinctif marquant (visuel ou signature). Ex: \"Immense épée noire.\", \"Neuf queues.\"\n" +
	"- Indice 5 : le plus évident, quasi donné. Ex: \"Frère de Yone.\", \"Renard légendaire.\"\n\n" +
	"Règles strictes :\n" +
	"- JAMAIS le nom du champion, ni un mot qui le contient.\n" +
	"- JAMAIS le nom exact de ses sorts/ulti (décris l'effet).\n" +
	"- N'AFFIRME PAS de région/cité précise (Zaun/Piltover/Ionia/Ixtal/Noxus/Demacia...) : source d'erreurs. Nature générale seulement (yordle, Darkin, mort-vivant, créature du Néant, esprit...).\n" +
	"- Exactitude sur le rôle, le gameplay et l'apparence.\n\n" +
	"Exemple pour Yasuo : {\"hints\":[\"Combattant au corps à corps.\",\"Très mobile, enchaîne les dashs.\",\"Manie le vent.\",\"Bloque tous les projectiles.\",\"Le frère de Yone.\"]}\n" +
	"Exemple pour Teemo : {\"hints\":[\"Tireur à distance.\",\"Compte sur la ruse et le poison.\",\"Devient invisible à l'arrêt.\",\"Pose des champignons piégés.\",\"Petit yordle au chapeau.\"]}\n\n" +
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
			temperature: 0.45,
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
const CONC = 2;
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
