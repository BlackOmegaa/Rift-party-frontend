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
	"Pour le champion donné, écris EXACTEMENT 5 indices en français, du plus DIFFICILE (indice 1) " +
	"au plus FACILE (indice 5). Difficulté progressive, mais CHAQUE indice doit être un VRAI indice " +
	"concret et compréhensible, sur lequel un joueur peut raisonner.\n\n" +
	"CONTENU des indices (utilise des faits CONCRETS, pas de la poésie abstraite) :\n" +
	"- Indice 1 (dur mais juste) : rôle/classe + nature générale (ex: yordle, mort-vivant, Darkin, créature du Néant, esprit, homme-bête) OU un fait de personnalité/lore peu évident.\n" +
	"- Indices 2-3 : mécanique de gameplay reconnaissable, style de jeu, trait visuel marquant.\n" +
	"- Indice 4 : élément iconique (capacité signature décrite SANS son nom, relation avec un autre champion, réplique culte).\n" +
	"- Indice 5 (facile) : le trait le plus évident, presque donné — mais toujours sans le nom.\n\n" +
	"Règles :\n" +
	"- NE JAMAIS écrire le nom du champion (ni un mot qui le contient).\n" +
	"- NE JAMAIS écrire le nom exact de ses sorts/ulti (décris l'effet à la place).\n" +
	"- CLARTÉ avant tout : un joueur doit COMPRENDRE chaque indice. Interdit : métaphores obscures, fragments absurdes.\n" +
	"- N'AFFIRME PAS de ville/région précise (Zaun, Piltover, Ionia, Ixtal, Noxus, Demacia, Îles Obscures...) : c'est une source d'erreurs. Reste sur la NATURE générale (yordle, Darkin, mort-vivant, créature du Néant...) que tu connais avec certitude.\n" +
	"- EXACTITUDE : rôle, gameplay, apparence, lore corrects. Dans le doute, décris le gameplay/visuel plutôt que le lore.\n" +
	"- Phrases courtes mais COMPLÈTES et naturelles (8-14 mots), pas des fragments décoratifs.\n\n" +
	"Exemple pour Yasuo : {\"hints\":[" +
	"\"Épéiste errant et maudit, accusé à tort du meurtre de son maître.\"," +
	"\"Un bretteur très mobile qui manie le vent au combat.\"," +
	"\"Peut ériger un mur mouvant qui bloque tous les projectiles.\"," +
	"\"Traverse sbires et ennemis d'un dash sans réelle limite.\"," +
	"\"Le frère de Yone, fidèle à une seule et unique épée.\"]}\n\n" +
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
