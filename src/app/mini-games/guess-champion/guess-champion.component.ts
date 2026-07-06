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
	championLoadingUrl,
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

interface GuessRound {
	answer: string;
	title: string;
	hints: string[];
}

const ROUNDS: GuessRound[] = [
	{
		answer: "Aatrox",
		title: "Il rêve d’une seule chose : la fin du monde.",
		hints: ["Darkin.", "Manie une immense épée.", "World Ender."],
	},
	{
		answer: "Ahri",
		title: "Toujours capable de trouver un angle.",
		hints: [
			"Mage très mobile.",
			"Son charme peut retourner un duel.",
			"Spirit Rush.",
		],
	},
	{
		answer: "Akali",
		title: "Quand elle disparaît, il est souvent déjà trop tard.",
		hints: [
			"Assassin d’Ionia.",
			"Utilise un écran de fumée.",
			"Perfect Execution.",
		],
	},
	{
		answer: "Akshan",
		title: "Le héros qui ne respecte pas vraiment les règles.",
		hints: [
			"ADC atypique.",
			"Possède un grappin.",
			"Peut ressusciter des alliés.",
		],
	},
	{
		answer: "Alistar",
		title: "Impossible de le déplacer quand il décide d’avancer.",
		hints: [
			"Support tank.",
			"Combo classique : W puis Q.",
			"Unbreakable Will.",
		],
	},
	{
		answer: "Amumu",
		title: "Cherche un ami depuis bien trop longtemps.",
		hints: ["Jungler tank.", "Lance des bandages.", "Curse of the Sad Mummy."],
	},
	{
		answer: "Anivia",
		title: "Même morte, elle n’a pas toujours dit son dernier mot.",
		hints: ["Mage de Freljord.", "Peut créer un mur de glace.", "Renaissance."],
	},
	{
		answer: "Annie",
		title: "Petite taille, gros problème.",
		hints: [
			"Accumule un passif avant de stun.",
			"Aime les ours en peluche.",
			"Tibbers.",
		],
	},
	{
		answer: "Aphelios",
		title: "Lire sa compétence prend plus longtemps que certains teamfights.",
		hints: ["ADC.", "Change constamment d’armes.", "Cinq armes différentes."],
	},
	{
		answer: "Ashe",
		title: "Même à l’autre bout de la map, elle peut commencer un combat.",
		hints: ["ADC utilitaire.", "Ralentit avec ses attaques.", "Crystal Arrow."],
	},
	{
		answer: "Aurelion Sol",
		title: "Créer une étoile est presque devenu banal.",
		hints: [
			"Dragon céleste.",
			"Contrôle le vide de l’espace.",
			"Falling Star.",
		],
	},
	{
		answer: "Azir",
		title: "Il préfère envoyer les autres se battre.",
		hints: ["Mage de Shurima.", "Contrôle des soldats.", "Emperor’s Divide."],
	},
	{
		answer: "Bard",
		title: "Personne ne comprend vraiment ce qu’il raconte.",
		hints: ["Support.", "Collectionne des carillons.", "Tempered Fate."],
	},
	{
		answer: "Bel'Veth",
		title: "Elle veut tout consommer.",
		hints: ["Créature du Néant.", "Très forte en combats prolongés.", "Coral."],
	},
	{
		answer: "Blitzcrank",
		title: "Un seul clic peut décider d’une partie.",
		hints: ["Support.", "Son grab est mythique.", "Rocket Grab."],
	},
	{
		answer: "Brand",
		title: "Tout finit toujours par brûler.",
		hints: ["Mage.", "Accumule des marques de feu.", "Pyroclasm."],
	},
	{
		answer: "Braum",
		title: "Le véritable bouclier de son équipe.",
		hints: [
			"Support tank.",
			"Porte une immense porte.",
			"The Heart of the Freljord.",
		],
	},
	{
		answer: "Briar",
		title: "Le self-control n’est clairement pas son point fort.",
		hints: ["Jungler.", "Entre dans une frénésie.", "Bloody Frenzy."],
	},
	{
		answer: "Caitlyn",
		title: "Toujours quelques pas trop loin.",
		hints: ["ADC.", "Pose des pièges.", "Ace in the Hole."],
	},
	{
		answer: "Camille",
		title: "La précision avant tout.",
		hints: ["Toplane.", "Possède des jambes-lames.", "Hextech Ultimatum."],
	},
	{
		answer: "Cassiopeia",
		title: "Mieux vaut éviter de la regarder.",
		hints: ["Mage.", "Ne peut pas acheter de bottes.", "Petrifying Gaze."],
	},
	{
		answer: "Cho'Gath",
		title: "Chaque élimination le rend plus difficile à ignorer.",
		hints: ["Tank du Néant.", "Grandit pendant la partie.", "Feast."],
	},
	{
		answer: "Corki",
		title: "Livraison express.",
		hints: ["ADC atypique.", "Pilote un petit avion.", "The Package."],
	},
	{
		answer: "Darius",
		title: "S’il commence à reset, il vaut mieux courir.",
		hints: ["Toplane.", "Accumule des saignements.", "Noxian Guillotine."],
	},
	{
		answer: "Diana",
		title: "La lune a rarement été aussi agressive.",
		hints: [
			"Assassin AP.",
			"Très forte après avoir touché son Q.",
			"Moonfall.",
		],
	},
	{
		answer: "Dr. Mundo",
		title: "Il va exactement là où il en a envie.",
		hints: [
			"Tank.",
			"Ignore parfois les contrôles.",
			"Le médecin le moins rassurant de Runeterra.",
		],
	},
	{
		answer: "Draven",
		title: "Il joue autant contre ses ennemis que pour son ego.",
		hints: [
			"ADC.",
			"Récupère ses haches pour maximiser ses dégâts.",
			"League of Draven.",
		],
	},
	{
		answer: "Ekko",
		title: "Quand tout se passe mal, il recommence.",
		hints: ["Assassin AP.", "Manipule le temps.", "Chronobreak."],
	},
	{
		answer: "Elise",
		title: "Deux formes, deux façons de te tuer.",
		hints: ["Jungle.", "Peut se transformer.", "Spider Form."],
	},
	{
		answer: "Evelynn",
		title: "Tu ne la vois généralement qu’une seule fois.",
		hints: [
			"Assassin.",
			"Devient invisible après le niveau 6.",
			"Last Caress.",
		],
	},
	{
		answer: "Ezreal",
		title: "Toujours prêt à explorer... de très loin.",
		hints: ["ADC.", "Très mobile.", "Trueshot Barrage."],
	},
	{
		answer: "Fiddlesticks",
		title: "Le silence avant le carnage.",
		hints: ["Jungler.", "Aime surprendre depuis les buissons.", "Crowstorm."],
	},
	{
		answer: "Fiora",
		title: "Chaque duel est une démonstration.",
		hints: ["Toplane.", "Cherche les points faibles.", "Grand Challenge."],
	},
	{
		answer: "Fizz",
		title: "Il est plus difficile à attraper qu’à supporter.",
		hints: ["Assassin AP.", "Peut devenir intouchable.", "Chum the Waters."],
	},
	{
		answer: "Galio",
		title: "Il arrive rarement seul dans un combat.",
		hints: [
			"Tank AP.",
			"Très fort contre les dégâts magiques.",
			"Hero’s Entrance.",
		],
	},
	{
		answer: "Gangplank",
		title: "Un baril suffit parfois.",
		hints: ["Toplane.", "Accumule des barils explosifs.", "Cannon Barrage."],
	},
	{
		answer: "Garen",
		title: "Simple, efficace et très bruyant.",
		hints: ["Toplane.", "Tourne sur lui-même.", "Demacia."],
	},
	{
		answer: "Gnar",
		title: "Petit... jusqu’à ce qu’il ne le soit plus.",
		hints: ["Toplane.", "Change de forme.", "GNAR!"],
	},
	{
		answer: "Gragas",
		title: "Chaque combat commence souvent par une boisson.",
		hints: ["Tank.", "Utilise des tonneaux.", "Explosive Cask."],
	},
	{
		answer: "Graves",
		title: "Le seul ADC qui recharge comme un fusil.",
		hints: ["Jungle.", "Utilise un shotgun.", "Collateral Damage."],
	},
	{
		answer: "Gwen",
		title: "Les aiguilles font parfois très mal.",
		hints: [
			"Toplane AP.",
			"Ignore les attaques extérieures dans sa brume.",
			"Hallowed Mist.",
		],
	},
	{
		answer: "Hecarim",
		title: "Quand tu l’entends arriver, il est souvent déjà trop tard.",
		hints: ["Jungler.", "Très rapide.", "Onslaught of Shadows."],
	},
	{
		answer: "Heimerdinger",
		title: "Pourquoi combattre soi-même quand les machines peuvent le faire ?",
		hints: ["Mage.", "Pose plusieurs tourelles.", "Upgrade!!!"],
	},
	{
		answer: "Hwei",
		title: "Trois sujets. Dix sorts.",
		hints: ["Mage.", "Chaque compétence dépend d’un choix.", "Visionary."],
	},
	{
		answer: "Illaoi",
		title: "Les tentacules ne sont jamais très loin.",
		hints: ["Toplane.", "Arrache l’esprit de ses ennemis.", "Leap of Faith."],
	},
	{
		answer: "Irelia",
		title: "Chaque dash prépare le suivant.",
		hints: ["Toplane.", "Manipule des lames.", "Vanguard’s Edge."],
	},
	{
		answer: "Ivern",
		title: "Le seul jungler qui préfère éviter de tuer les monstres.",
		hints: ["Support jungle.", "Libère les camps.", "Daisy."],
	},
	{
		answer: "Janna",
		title: "Elle décide souvent qui peut avancer.",
		hints: ["Support.", "Contrôle énormément les déplacements.", "Monsoon."],
	},
	{
		answer: "Jarvan IV",
		title: "Quand il engage, tout le monde reste.",
		hints: ["Jungler.", "Combo drapeau + lance.", "Cataclysm."],
	},
	{
		answer: "Jax",
		title: "Imagine-le avec une vraie arme.",
		hints: ["Toplane.", "Évite les attaques de base.", "Counter Strike."],
	},
	{
		answer: "Jayce",
		title: "Pourquoi choisir entre marteau et canon ?",
		hints: [
			"Originaire de Piltover.",
			"Peut changer d’arme instantanément.",
			"Mercury Cannon.",
		],
	},
	{
		answer: "Jhin",
		title: "Pour lui, tout est une question de mise en scène.",
		hints: [
			"ADC.",
			"Recharge après un certain nombre de tirs.",
			"Le chiffre 4 est partout.",
		],
	},
	{
		answer: "Jinx",
		title: "Le chaos est rarement un accident.",
		hints: ["ADC.", "Change entre deux armes.", "Super Mega Death Rocket!"],
	},
	{
		answer: "K'Sante",
		title: "Il abandonne sa défense pour finir le travail.",
		hints: ["Toplane.", "Tank qui peut devenir bruiser.", "All Out."],
	},
	{
		answer: "Kai'Sa",
		title: "Elle attend juste la bonne ouverture.",
		hints: [
			"ADC.",
			"Évolue ses compétences.",
			"Peut foncer sur une cible marquée.",
		],
	},
	{
		answer: "Kalista",
		title: "Le moindre faux pas se paie immédiatement.",
		hints: [
			"ADC.",
			"Saute après chaque attaque.",
			"Liée à un allié dès le début.",
		],
	},
	{
		answer: "Karma",
		title: "Une compétence, deux versions.",
		hints: [
			"Support ou mage.",
			"Renforce ses sorts avec son ultime.",
			"Mantra.",
		],
	},
	{
		answer: "Karthus",
		title: "Même mort, il continue de jouer.",
		hints: ["Mage.", "Inflige encore des dégâts après sa mort.", "Requiem."],
	},
	{
		answer: "Kassadin",
		title: "Chaque niveau le rend plus difficile à attraper.",
		hints: ["Mage assassin.", "Très fort en fin de partie.", "Riftwalk."],
	},
	{
		answer: "Katarina",
		title: "Ramasser une dague change tout.",
		hints: ["Assassin AP.", "Reset sur les éliminations.", "Death Lotus."],
	},
	{
		answer: "Kayle",
		title: "La patience finit souvent par payer.",
		hints: [
			"Toplane.",
			"Devient de plus en plus puissante avec les niveaux.",
			"Divine Judgment.",
		],
	},
	{
		answer: "Kayn",
		title: "Il doit faire un choix avant de révéler son vrai potentiel.",
		hints: ["Jungler.", "Deux formes possibles.", "Shadow Assassin ou Rhaast."],
	},
	{
		answer: "Kennen",
		title: "Petit, rapide et électrisant.",
		hints: ["Toplane.", "Accumule des marques.", "Slicing Maelstrom."],
	},
	{
		answer: "Kha'Zix",
		title: "Les cibles isolées le savent trop bien.",
		hints: [
			"Jungler assassin.",
			"Évolue ses compétences.",
			"Taste Their Fear.",
		],
	},
	{
		answer: "Kindred",
		title: "Deux personnages, une seule entité.",
		hints: ["Jungle.", "Marque des cibles.", "Lamb et Wolf."],
	},
	{
		answer: "Kled",
		title: "La moitié de son courage tient sur quatre pattes.",
		hints: ["Toplane.", "Combat avec Skaarl.", "Charge toute son équipe."],
	},
	{
		answer: "Kog'Maw",
		title: "Plus il tire de loin, moins c’est rassurant.",
		hints: ["ADC.", "Très fort contre les tanks.", "Bio-Arcane Barrage."],
	},
	{
		answer: "LeBlanc",
		title: "Impossible d’être sûr de laquelle est la vraie.",
		hints: ["Mage assassin.", "Peut créer un clone.", "Distortion."],
	},
	{
		answer: "Lee Sin",
		title: "Les meilleurs clips commencent souvent par un saut.",
		hints: ["Jungler.", "Ward Hop.", "Dragon's Rage."],
	},
	{
		answer: "Leona",
		title: "Quand elle engage, quelqu’un finit contrôlé.",
		hints: ["Support tank.", "Très riche en contrôles.", "Solar Flare."],
	},
	{
		answer: "Lillia",
		title: "Courir est sa solution à presque tout.",
		hints: [
			"Jungle AP.",
			"Accumule énormément de vitesse.",
			"Lilting Lullaby.",
		],
	},
	{
		answer: "Lissandra",
		title: "Parfois, la meilleure cible… c’est elle-même.",
		hints: ["Mage.", "Peut se rendre invulnérable.", "Frozen Tomb."],
	},
	{
		answer: "Lucian",
		title: "Deux tirs valent mieux qu’un.",
		hints: ["ADC.", "Très mobile.", "The Culling."],
	},
	{
		answer: "Lulu",
		title: "Elle décide souvent qui devient impossible à tuer.",
		hints: ["Support.", "Transforme ses ennemis.", "Wild Growth."],
	},
	{
		answer: "Lux",
		title: "Une compétence touche… et tout le monde regarde la suite.",
		hints: ["Mage.", "Très longue portée.", "Final Spark."],
	},
	{
		answer: "Malphite",
		title: "Le combat commence souvent quand il disparaît de ton écran.",
		hints: [
			"Tank.",
			"Très fort contre les dégâts physiques.",
			"Unstoppable Force.",
		],
	},
	{
		answer: "Malzahar",
		title: "Son plan est simple : appuyer sur R.",
		hints: ["Mage.", "Invoque des créatures du Néant.", "Nether Grasp."],
	},
	{
		answer: "Maokai",
		title: "Même les buissons ne sont pas vraiment sûrs.",
		hints: ["Tank.", "Lance des jeunes pousses.", "Nature's Grasp."],
	},
	{
		answer: "Master Yi",
		title: "Quand il reset, quelqu’un panique.",
		hints: ["Jungler.", "Très fort en nettoyage de teamfight.", "Highlander."],
	},
	{
		answer: "Milio",
		title: "Le plus gentil... jusqu’à ce que son ADC devienne intuable.",
		hints: ["Support.", "Augmente la portée des alliés.", "Breath of Life."],
	},
	{
		answer: "Miss Fortune",
		title: "Si personne ne l’interrompt, la teamfight est déjà finie.",
		hints: ["ADC.", "Très forte en zone.", "Bullet Time."],
	},
	{
		answer: "Mordekaiser",
		title: "Parfois, il décide juste que vous allez régler ça à deux.",
		hints: ["Toplane.", "Isole un ennemi.", "Realm of Death."],
	},
	{
		answer: "Morgana",
		title: "Le bouclier qui fait soupirer les supports engage.",
		hints: ["Support ou mage.", "Immobilisation très longue.", "Black Shield."],
	},
	{
		answer: "Naafiri",
		title: "Elle n’arrive jamais vraiment seule.",
		hints: ["Assassin.", "Combat avec sa meute.", "The Call of the Pack."],
	},
	{
		answer: "Nami",
		title: "Tout paraît plus facile quand elle est derrière toi.",
		hints: ["Support.", "Contrôle l’eau.", "Tidal Wave."],
	},
	{
		answer: "Nasus",
		title: "Plus la partie dure, plus tu regrettes.",
		hints: ["Toplane.", "Accumule des stacks.", "Siphoning Strike."],
	},
	{
		answer: "Nautilus",
		title: "Son grab trouve toujours quelqu’un.",
		hints: ["Support tank.", "Très riche en contrôles.", "Depth Charge."],
	},
	{
		answer: "Neeko",
		title: "Tu ne sais jamais vraiment qui arrive.",
		hints: ["Mage.", "Peut prendre l’apparence d’un allié.", "Pop Blossom."],
	},
	{
		answer: "Nidalee",
		title: "Une lance peut suffire.",
		hints: ["Jungle.", "Deux formes.", "Cougar Form."],
	},
	{
		answer: "Nilah",
		title: "Elle transforme les combats rapprochés en spectacle.",
		hints: [
			"ADC.",
			"Corps à corps.",
			"Apporte de l’expérience supplémentaire.",
		],
	},
	{
		answer: "Nocturne",
		title: "Quand les lumières s’éteignent, quelqu’un disparaît.",
		hints: ["Jungler.", "Éteint la vision de toute la map.", "Paranoia."],
	},
	{
		answer: "Nunu & Willump",
		title: "Une boule de neige peut vite devenir incontrôlable.",
		hints: ["Jungler.", "Très fort sur les objectifs.", "Absolute Zero."],
	},
	{
		answer: "Olaf",
		title: "Les contrôles ? Très peu pour lui.",
		hints: ["Bruiser.", "Lance des haches.", "Ragnarok."],
	},
	{
		answer: "Orianna",
		title: "Tout dépend de l’endroit où se trouve sa balle.",
		hints: ["Mage.", "Contrôle une sphère.", "Shockwave."],
	},
	{
		answer: "Ornn",
		title: "Il forge son équipement sans rentrer à la base.",
		hints: ["Tank.", "Peut améliorer des objets.", "Call of the Forge God."],
	},
	{
		answer: "Pantheon",
		title: "Il préfère arriver du ciel.",
		hints: ["Bruiser.", "Bloque les dégâts devant lui.", "Grand Starfall."],
	},
	{
		answer: "Poppy",
		title: "Les dashs ne sont pas les bienvenus.",
		hints: ["Tank.", "Peut empêcher les déplacements.", "Steadfast Presence."],
	},
	{
		answer: "Pyke",
		title: "Les exécutions profitent à toute l’équipe.",
		hints: ["Support assassin.", "Reset son ultime.", "Death From Below."],
	},
	{
		answer: "Qiyana",
		title: "Chaque terrain devient une arme.",
		hints: [
			"Assassin.",
			"Manipule les éléments.",
			"Supreme Display of Talent.",
		],
	},
	{
		answer: "Quinn",
		title: "Elle n’est jamais seule très longtemps.",
		hints: ["Toplane ou ADC.", "Combat avec Valor.", "Behind Enemy Lines."],
	},
	{
		answer: "Rakan",
		title: "Il engage avec autant de style que de vitesse.",
		hints: ["Support.", "Très mobile autour de ses alliés.", "The Quickness."],
	},
	{
		answer: "Rammus",
		title: "Il a rarement besoin de parler pour se faire comprendre.",
		hints: ["Tank.", "Se déplace en boule.", "Ok."],
	},
	{
		answer: "Rek'Sai",
		title: "Même sous terre, elle te trouve.",
		hints: ["Jungler.", "Creuse des tunnels.", "Void Rush."],
	},
	{
		answer: "Rell",
		title: "Quand elle engage, toute la map le sait.",
		hints: ["Support tank.", "Contrôle le métal.", "Magnet Storm."],
	},
	{
		answer: "Renata Glasc",
		title: "Les combats tournent parfois contre leurs propres alliés.",
		hints: [
			"Support.",
			"Peut ressusciter temporairement.",
			"Hostile Takeover.",
		],
	},
	{
		answer: "Renekton",
		title: "Les premiers niveaux sont souvent à son avantage.",
		hints: ["Toplane.", "Utilise une barre de Fureur.", "Dominus."],
	},
	{
		answer: "Rengar",
		title: "Le buisson est rarement vide.",
		hints: ["Assassin.", "Bondit sur ses cibles.", "Thrill of the Hunt."],
	},
	{
		answer: "Riven",
		title: "Chaque animation compte.",
		hints: ["Toplane.", "Épée brisée.", "Blade of the Exile."],
	},
	{
		answer: "Rumble",
		title: "La température décide souvent du combat.",
		hints: ["Toplane.", "Gère une jauge de chaleur.", "The Equalizer."],
	},
	{
		answer: "Ryze",
		title: "Il collectionne bien plus que des victoires.",
		hints: ["Mage.", "Cherche les Runes.", "Realm Warp."],
	},
	{
		answer: "Samira",
		title: "Le spectacle commence quand le combo est complet.",
		hints: ["ADC.", "Accumule un style de combat.", "Inferno Trigger."],
	},
	{
		answer: "Sejuani",
		title: "Elle préfère charger avec toute sa cavalerie.",
		hints: [
			"Jungler tank.",
			"Combat sur un énorme sanglier.",
			"Glacial Prison.",
		],
	},
	{
		answer: "Senna",
		title: "Chaque âme compte.",
		hints: ["Support ou ADC.", "Ramasse des âmes.", "Dawning Shadow."],
	},
	{
		answer: "Seraphine",
		title: "Plus il y a d'alliés, plus elle brille.",
		hints: ["Mage / Support.", "Très forte en teamfight.", "Encore."],
	},
	{
		answer: "Sett",
		title: "Parfois, la meilleure arme... c’est toi.",
		hints: ["Toplane.", "Très fort au corps à corps.", "The Show Stopper."],
	},
	{
		answer: "Shaco",
		title: "Le vrai problème est souvent celui que tu n' as pas vu.",
		hints: ["Assassin.", "Pose des boîtes.", "Hallucinate."],
	},
	{
		answer: "Shen",
		title: "Il n'est jamais vraiment loin.",
		hints: [
			"Toplane.",
			"Peut rejoindre un allié instantanément.",
			"Stand United.",
		],
	},
	{
		answer: "Shyvana",
		title: "Un dragon finit toujours par apparaître.",
		hints: [
			"Jungle.",
			"Très dépendante de sa forme ultime.",
			"Dragon's Descent.",
		],
	},
	{
		answer: "Singed",
		title: "Le poursuivre est rarement une bonne idée.",
		hints: ["Toplane.", "Laisse une traînée de poison.", "Insanity Potion."],
	},
	{
		answer: "Sion",
		title: "Même mort, il continue d'avancer.",
		hints: ["Tank.", "Peut foncer sur toute la map.", "Unstoppable Onslaught."],
	},
	{
		answer: "Sivir",
		title: "Un seul objet peut faire rebondir toute la vague.",
		hints: ["ADC.", "Possède un bouclier anti-sort.", "Ricochet."],
	},
	{
		answer: "Skarner",
		title: "Personne n'aime finir au bout de sa queue.",
		hints: ["Jungler.", "Capture une cible.", "Impale."],
	},
	{
		answer: "Smolder",
		title: "Petit dragon, gros potentiel.",
		hints: ["ADC.", "Devient plus fort avec ses stacks.", "MMOOOMMMM!"],
	},
	{
		answer: "Sona",
		title: "Elle parle très peu, mais toute son équipe l'entend.",
		hints: ["Support.", "Utilise plusieurs auras.", "Crescendo."],
	},
	{
		answer: "Soraka",
		title: "Tout le monde adore la voir... sauf les assassins.",
		hints: [
			"Support.",
			"Sacrifie parfois sa propre vie pour soigner.",
			"Wish.",
		],
	},
	{
		answer: "Swain",
		title: "Il voit plus de choses que tout le monde.",
		hints: [
			"Mage de Noxus.",
			"Des corbeaux l’accompagnent partout.",
			"Transforme un teamfight en drain géant.",
		],
	},
	{
		answer: "Sylas",
		title: "Son ultime dépend surtout du tien.",
		hints: [
			"Mage au corps à corps.",
			"S’échappe facilement avec ses chaînes.",
			"Peut voler les ultimes ennemis.",
		],
	},
	{
		answer: "Syndra",
		title: "Plus il y a de sphères, plus quelqu’un disparaît.",
		hints: ["Mage.", "Contrôle des sphères noires.", "Unleashed Power."],
	},
	{
		answer: "Tahm Kench",
		title: "Il peut sauver un allié... ou simplement le manger.",
		hints: ["Support tank.", "Très fort en lane.", "Devour."],
	},
	{
		answer: "Taliyah",
		title: "Le terrain devient son terrain de jeu.",
		hints: [
			"Mage.",
			"Contrôle les rochers.",
			"Peut traverser la map avec un mur.",
		],
	},
	{
		answer: "Talon",
		title: "Les murs ne sont qu’un léger détail.",
		hints: ["Assassin AD.", "Très mobile sur la map.", "Assassin de Noxus."],
	},
	{
		answer: "Taric",
		title: "Les gemmes sont vraiment extraordinaires.",
		hints: [
			"Support.",
			"Peut rendre son équipe invulnérable.",
			"Cosmic Radiance.",
		],
	},
	{
		answer: "Teemo",
		title: "Personne ne l’aime jusqu’à ce qu’il soit dans son équipe.",
		hints: [
			"Toplane.",
			"Pose des champignons.",
			"Le capitaine des éclaireurs.",
		],
	},
	{
		answer: "Thresh",
		title: "Une lanterne peut sauver une game.",
		hints: ["Support.", "Ramasse les âmes.", "Death Sentence."],
	},
	{
		answer: "Tristana",
		title: "Plus elle tire, plus elle tire loin.",
		hints: ["ADC.", "Très forte sur les tours.", "Rocket Jump."],
	},
	{
		answer: "Trundle",
		title: "Il adore voler les statistiques des tanks.",
		hints: ["Bruiser.", "Crée un énorme pilier.", "Subjugate."],
	},
	{
		answer: "Tryndamere",
		title: "Refuse parfois tout simplement de mourir.",
		hints: ["Toplane.", "Accumule de la fureur.", "Undying Rage."],
	},
	{
		answer: "Twisted Fate",
		title: "Les cartes sont rarement distribuées au hasard.",
		hints: ["Mage.", "Choisit entre trois cartes.", "Destiny."],
	},
	{
		answer: "Twitch",
		title: "Il apparaît souvent quand tu penses être en sécurité.",
		hints: ["ADC.", "Devient invisible.", "Rat-ta-tat-tat."],
	},
	{
		answer: "Udyr",
		title: "Pourquoi avoir un ultime quand on peut avoir quatre styles ?",
		hints: ["Jungler.", "Change constamment de posture.", "Le spirit walker."],
	},
	{
		answer: "Urgot",
		title: "Ses chaînes annoncent rarement une bonne nouvelle.",
		hints: ["Toplane.", "Très fort contre les bruisers.", "Fear Beyond Death."],
	},
	{
		answer: "Varus",
		title: "Chaque flèche prépare la suivante.",
		hints: ["ADC.", "Accumule des marques.", "Chain of Corruption."],
	},
	{
		answer: "Vayne",
		title: "Les tanks préfèrent éviter de la croiser.",
		hints: ["ADC.", "Très forte en duel.", "Silver Bolts."],
	},
	{
		answer: "Veigar",
		title: "Plus la partie dure, plus il sourit.",
		hints: ["Mage.", "Accumule de la puissance.", "Primordial Burst."],
	},
	{
		answer: "Vel'Koz",
		title: "Pour lui, tout n’est qu’une expérience.",
		hints: [
			"Mage du Néant.",
			"Analyse ses cibles.",
			"Life Form Disintegration Ray.",
		],
	},
	{
		answer: "Vex",
		title: "Même sa mauvaise humeur fait des dégâts.",
		hints: ["Mage.", "Combat avec son ombre.", "Shadow Surge."],
	},
	{
		answer: "Vi",
		title: "La solution passe souvent par un énorme coup de poing.",
		hints: ["Jungler.", "Charge son Q.", "Cease and Desist."],
	},
	{
		answer: "Viego",
		title: "Chaque élimination peut changer le combat.",
		hints: ["Jungler.", "Possède les champions ennemis.", "Le Roi Déchu."],
	},
	{
		answer: "Viktor",
		title: "Chaque amélioration le rapproche de son idéal.",
		hints: ["Mage.", "Évolue ses compétences.", "Glorious Evolution."],
	},
	{
		answer: "Vladimir",
		title: "Les points de vie sont surtout une ressource.",
		hints: ["Mage.", "Utilise son propre sang.", "Sanguine Pool."],
	},

	{
		answer: "Warwick",
		title: "L’odeur du sang lui suffit.",
		hints: [
			"Jungler.",
			"Court plus vite vers les ennemis blessés.",
			"Infinite Duress.",
		],
	},
	{
		answer: "Wukong",
		title: "Un clone. Un bâton. Beaucoup trop de pression.",
		hints: [
			"Top/Jungle.",
			"Peut devenir invisible un court instant.",
			"Cyclone.",
		],
	},
	{
		answer: "Xayah",
		title: "Chaque plume laissée au sol compte.",
		hints: ["ADC.", "Rappelle ses plumes.", "Featherstorm."],
	},
	{
		answer: "Xerath",
		title: "Il préfère combattre à deux écrans de distance.",
		hints: ["Mage.", "Très longue portée.", "Arcane Barrage."],
	},
	{
		answer: "Xin Zhao",
		title: "Le premier à entrer, rarement le dernier debout.",
		hints: ["Jungler.", "Très fort en duel.", "Crescent Guard."],
	},
	{
		answer: "Yasuo",
		title: "Une tornade suffit parfois.",
		hints: ["Mid/Top.", "Son ultime nécessite un knock-up.", "Steel Tempest."],
	},
	{
		answer: "Yone",
		title: "Il revient toujours à son point de départ.",
		hints: ["Mid/Top.", "Alterne deux épées.", "Soul Unbound."],
	},
	{
		answer: "Yorick",
		title: "Il ne se bat presque jamais seul.",
		hints: ["Toplane.", "Invoque des goules.", "Maiden of the Mist."],
	},
	{
		answer: "Yuumi",
		title: "Son meilleur placement est souvent sur quelqu’un d’autre.",
		hints: ["Support.", "Peut devenir inciblable.", "Final Chapter."],
	},
	{
		answer: "Zac",
		title: "Plus il rebondit, plus ça devient inquiétant.",
		hints: [
			"Tank.",
			"Ramasse ses morceaux pour se soigner.",
			"Elastic Slingshot.",
		],
	},
	{
		answer: "Zed",
		title: "L’ombre est rarement là par hasard.",
		hints: ["Assassin AD.", "Utilise des ombres.", "Death Mark."],
	},
	{
		answer: "Zeri",
		title: "Ses attaques ne ressemblent à aucune autre.",
		hints: ["ADC.", "Très mobile.", "Son attaque de base est un sort."],
	},
	{
		answer: "Ziggs",
		title: "Tout explose, la question est juste : quand ?",
		hints: ["Mage.", "Excellent contre les tours.", "Mega Inferno Bomb."],
	},
	{
		answer: "Zilean",
		title: "Le temps joue pour lui.",
		hints: ["Support/Mage.", "Peut ressusciter un allié.", "Chronoshift."],
	},
	{
		answer: "Zoe",
		title: "Elle transforme une erreur en one-shot.",
		hints: [
			"Mage.",
			"Ramasse les sorts d’invocateur.",
			"Sleepy Trouble Bubble.",
		],
	},
	{
		answer: "Zyra",
		title: "Le moindre buisson peut devenir dangereux.",
		hints: ["Support/Mage.", "Fait pousser des plantes.", "Stranglethorns."],
	},
];

@Component({
	selector: "app-guess-champion",
	standalone: true,
	imports: [FormsModule, ChampionSelectComponent, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './guess-champion.component.html',
	styleUrl: './guess-champion.component.scss',
})
export class GuessChampionComponent implements OnDestroy {
	private rounds: GuessRound[] = [];

	private shuffleRounds() {
		this.rounds = [...ROUNDS];

		for (let i = this.rounds.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.rounds[i], this.rounds[j]] = [this.rounds[j], this.rounds[i]];
		}
	}

	protected readonly championOptions = CHAMPION_OPTIONS;
	protected readonly maxRounds = computed(() =>
		this.mix.active()
			? this.mix.roundSize()
			: this.settings.roundsFor("guess-champion"),
	);
	protected readonly basePoints = 10;
	protected readonly hintPenalty = 5;
	protected index = signal(0);
	protected submittedToMix = signal(false);
	protected hintCount = signal(1);
	protected score = signal(0);
	protected correctCount = signal(0);
	protected locked = signal(false);
	/** Resultat du round en cours, pilote l'overlay de verdict cinematique. */
	protected verdict = signal<"correct" | "wrong" | "timeout" | null>(null);
	protected lastGain = signal(0);
	private autoNextTimer?: ReturnType<typeof setTimeout>;
	protected readonly timer = new RoundTimer();
	protected remainingSec = signal(0);
	answer = "";
	round = computed(() => this.rounds[this.index()]);
	roundNumber = computed(() => this.index() + 1);
	finished = computed(() => this.index() >= this.maxRounds());
	visibleHints = computed(() => this.round().hints.slice(0, this.hintCount()));
	pointsAtStake = computed(() =>
		Math.max(0, this.basePoints - (this.hintCount() - 1) * this.hintPenalty),
	);
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
		this.startRoundTimer();
		this.room.onGameRestarted((payload) => {
			if (payload.gameId === "guess-champion") this.restart();
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
		// Entree animee de chaque round (enigme qui punch, barre d'action qui glisse).
		effect(() => {
			this.index();
			if (this.finished()) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".enigma"));
				slideUp(host.querySelector(".hint-chips"), { delay: 0.08 });
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
		this.lastGain.set(0);
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
		return championLoadingUrl(name);
	}
	revealHint() {
		if (this.locked() || this.hintCount() >= 3) return;
		this.hintCount.update((v) => Math.min(3, v + 1));
		this.audio.play("hint");
	}
	tryAnswer() {
		if (this.locked()) return;
		this.timer.stop();
		const host = this.hostElement.nativeElement;
		const stage = host.querySelector(".cine-stage") as HTMLElement | null;
		const ok =
			normalizeChampionName(this.answer) ===
			normalizeChampionName(this.round().answer);
		if (ok) {
			const points = this.pointsAtStake();
			this.lastGain.set(points);
			this.score.update((s) => s + points);
			this.correctCount.update((c) => c + 1);
			this.verdict.set("correct");
			this.audio.play("correct");
			burstParticles(stage, {
				colors: ["#3fd67a", "#c8aa6e", "#f0e6d2"],
				count: 36,
			});
			floatScore(stage, `+${points}`);
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
		this.index.update((i) => i + 1);
		if (this.finished()) {
			this.timer.stop();
			this.submitMix();
			return;
		}
		this.hintCount.set(1);
		this.answer = "";
		this.verdict.set(null);
		this.locked.set(false);
		this.startRoundTimer();
	}
	submitMix() {
		if (this.submittedToMix()) return;
		this.submittedToMix.set(true);
		this.room.submitMixSegment(
			this.score(),
			`Guess Champion : ${this.correctCount()}/${this.maxRounds()} bonnes réponses.`,
		);
	}
	requestRestart() {
		if (!this.room.isHost()) return;
		this.room.restartGame("guess-champion");
	}
	restart() {
		this.shuffleRounds();
		clearTimeout(this.autoNextTimer);
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.correctCount.set(0);
		this.hintCount.set(1);
		this.verdict.set(null);
		this.lastGain.set(0);
		this.answer = "";
		this.locked.set(false);
		this.startRoundTimer();
	}
}
