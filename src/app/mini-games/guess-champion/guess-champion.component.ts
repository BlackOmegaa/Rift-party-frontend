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
		title: "L'apocalypse portable, format une seule épée.",
		hints: ["Darkin.", "Manie une immense épée.", "World Ender."],
	},
	{
		answer: "Ahri",
		title: "Neuf queues, zéro excuse pour lui résister.",
		hints: [
			"Mage très mobile.",
			"Son charme peut retourner un duel.",
			"Spirit Rush.",
		],
	},
	{
		answer: "Akali",
		title: "Le temps qu'elle disparaisse dans la fumée, t'es déjà mort.",
		hints: [
			"Assassin d'Ionia.",
			"Utilise un écran de fumée.",
			"Perfect Execution.",
		],
	},
	{
		answer: "Akshan",
		title: "Justicier, voleur, séducteur : il coche toutes les cases.",
		hints: [
			"ADC atypique.",
			"Possède un grappin.",
			"Peut ressusciter des alliés.",
		],
	},
	{
		answer: "Alistar",
		title: "Le combo W-Q qui t'envoie visiter la tribune.",
		hints: [
			"Support tank.",
			"Combo classique : W puis Q.",
			"Unbreakable Will.",
		],
	},
	{
		answer: "Amumu",
		title: "La momie la plus triste de tout Runeterra cherche encore un ami.",
		hints: ["Jungler tank.", "Lance des bandages.", "Curse of the Sad Mummy."],
	},
	{
		answer: "Anivia",
		title: "Un oiseau qui refuse obstinément de rester mort.",
		hints: ["Mage de Freljord.", "Peut créer un mur de glace.", "Renaissance."],
	},
	{
		answer: "Annie",
		title: "Une gamine, un ours en peluche, et une bonne dose de nope.",
		hints: [
			"Accumule un passif avant de stun.",
			"Aime les ours en peluche.",
			"Tibbers.",
		],
	},
	{
		answer: "Aphelios",
		title: "Cinq armes, un mutisme total, et un mal de crâne pour tout le monde.",
		hints: ["ADC.", "Change constamment d'armes.", "Cinq armes différentes."],
	},
	{
		answer: "Ashe",
		title: "Une flèche qui traverse la carte pour te dire bonjour.",
		hints: ["ADC utilitaire.", "Ralentit avec ses attaques.", "Crystal Arrow."],
	},
	{
		answer: "Aurelion Sol",
		title: "Un dragon qui fabriquait des étoiles avant que ce soit la mode.",
		hints: [
			"Dragon céleste.",
			"Contrôle le vide de l'espace.",
			"Falling Star.",
		],
	},
	{
		answer: "Azir",
		title: "Un empereur qui fait bosser des soldats de sable à sa place.",
		hints: ["Mage de Shurima.", "Contrôle des soldats.", "Emperor's Divide."],
	},
	{
		answer: "Bard",
		title: "Un vagabond cosmique accro aux carillons et aux portails.",
		hints: ["Support.", "Collectionne des carillons.", "Tempered Fate."],
	},
	{
		answer: "Bel'Veth",
		title: "L'impératrice du Néant a une seule diète : tout.",
		hints: ["Créature du Néant.", "Très forte en combats prolongés.", "Coral."],
	},
	{
		answer: "Blitzcrank",
		title: "Un bras robotique, une distance ridicule, et ta game qui bascule.",
		hints: ["Support.", "Son grab est mythique.", "Rocket Grab."],
	},
	{
		answer: "Brand",
		title: "Ce type n'a jamais entendu parler des pompiers.",
		hints: ["Mage.", "Accumule des marques de feu.", "Pyroclasm."],
	},
	{
		answer: "Braum",
		title: "Une porte en guise de bouclier, une moustache en guise de style.",
		hints: [
			"Support tank.",
			"Porte une immense porte.",
			"The Heart of the Freljord.",
		],
	},
	{
		answer: "Briar",
		title: "Zéro chill, zéro frein, cent pour cent frénésie sanguinaire.",
		hints: ["Jungler.", "Entre dans une frénésie.", "Bloody Frenzy."],
	},
	{
		answer: "Caitlyn",
		title: "Le sniff qui te touche même trois lignes plus loin.",
		hints: ["ADC.", "Pose des pièges.", "Ace in the Hole."],
	},
	{
		answer: "Camille",
		title: "Des jambes-lames et une obsession pour la perfection chirurgicale.",
		hints: ["Toplane.", "Possède des jambes-lames.", "Hextech Ultimatum."],
	},
	{
		answer: "Cassiopeia",
		title: "Regarde-la dans les yeux et tu deviens statue.",
		hints: ["Mage.", "Ne peut pas acheter de bottes.", "Petrifying Gaze."],
	},
	{
		answer: "Cho'Gath",
		title: "Il mange, il grandit, tu pleures.",
		hints: ["Tank du Néant.", "Grandit pendant la partie.", "Feast."],
	},
	{
		answer: "Corki",
		title: "Un pilote qui préfère larguer des colis explosifs plutôt que voler haut.",
		hints: ["ADC atypique.", "Pilote un petit avion.", "The Package."],
	},
	{
		answer: "Darius",
		title: "Cinq stacks de saignement plus tard, c'est déjà terminé.",
		hints: ["Toplane.", "Accumule des saignements.", "Noxian Guillotine."],
	},
	{
		answer: "Diana",
		title: "Une prêtresse lunaire qui a troqué la contemplation contre le combo Q-E.",
		hints: [
			"Assassin AP.",
			"Très forte après avoir touché son Q.",
			"Moonfall.",
		],
	},
	{
		answer: "Dr. Mundo",
		title: "Zed dit qu'il va où il veut. Lui, il le fait vraiment, seringues en main.",
		hints: [
			"Tank.",
			"Ignore parfois les contrôles.",
			"Le médecin le moins rassurant de Runeterra.",
		],
	},
	{
		answer: "Draven",
		title: "Trop stylé pour rater ses haches, trop fier pour arrêter d'en parler.",
		hints: [
			"ADC.",
			"Récupère ses haches pour maximiser ses dégâts.",
			"League of Draven.",
		],
	},
	{
		answer: "Ekko",
		title: "Raté ? Pas grave, il rembobine et recommence.",
		hints: ["Assassin AP.", "Manipule le temps.", "Chronobreak."],
	},
	{
		answer: "Elise",
		title: "Araignée le jour, araignée le soir, araignée toute la partie.",
		hints: ["Jungle.", "Peut se transformer.", "Spider Form."],
	},
	{
		answer: "Evelynn",
		title: "Invisible jusqu'au niveau 6, fatale juste après.",
		hints: [
			"Assassin.",
			"Devient invisible après le niveau 6.",
			"Last Caress.",
		],
	},
	{
		answer: "Ezreal",
		title: "L'explorateur qui préfère esquiver le danger que l'affronter.",
		hints: ["ADC.", "Très mobile.", "Trueshot Barrage."],
	},
	{
		answer: "Fiddlesticks",
		title: "Dans le buisson vide, y'a peut-être un épouvantail affamé.",
		hints: ["Jungler.", "Aime surprendre depuis les buissons.", "Crowstorm."],
	},
	{
		answer: "Fiora",
		title: "Une escrimeuse qui vise toujours les mêmes quatre points.",
		hints: ["Toplane.", "Cherche les points faibles.", "Grand Challenge."],
	},
	{
		answer: "Fizz",
		title: "Un poisson qui saute au-dessus de tout, y compris de tes espoirs.",
		hints: ["Assassin AP.", "Peut devenir intouchable.", "Chum the Waters."],
	},
	{
		answer: "Galio",
		title: "La gargouille qui débarque juste quand ton mage adverse pousse trop.",
		hints: [
			"Tank AP.",
			"Très fort contre les dégâts magiques.",
			"Hero's Entrance.",
		],
	},
	{
		answer: "Gangplank",
		title: "Un pirate, des barils, et une gueule cassée qui fait toujours la loi.",
		hints: ["Toplane.", "Accumule des barils explosifs.", "Cannon Barrage."],
	},
	{
		answer: "Garen",
		title: "Pas de mana, pas de complexe, juste Demacia et une épée qui tourne.",
		hints: ["Toplane.", "Tourne sur lui-même.", "Demacia."],
	},
	{
		answer: "Gnar",
		title: "Mignon en petit, terrifiant en méga.",
		hints: ["Toplane.", "Change de forme.", "GNAR!"],
	},
	{
		answer: "Gragas",
		title: "Un tonneau, une gorgée, et un teamfight qui commence de travers.",
		hints: ["Tank.", "Utilise des tonneaux.", "Explosive Cask."],
	},
	{
		answer: "Graves",
		title: "L'unique ADC qui recharge son fusil comme un vrai bandit.",
		hints: ["Jungle.", "Utilise un shotgun.", "Collateral Damage."],
	},
	{
		answer: "Gwen",
		title: "Une poupée animée dont les ciseaux détestent particulièrement les mages.",
		hints: [
			"Toplane AP.",
			"Ignore les attaques extérieures dans sa brume.",
			"Hallowed Mist.",
		],
	},
	{
		answer: "Hecarim",
		title: "Le galop fantomatique qu'on entend avant de comprendre qu'on est mort.",
		hints: ["Jungler.", "Très rapide.", "Onslaught of Shadows."],
	},
	{
		answer: "Heimerdinger",
		title: "Un savant de Piltover qui laisse des tourelles régler ses problèmes.",
		hints: ["Mage.", "Pose plusieurs tourelles.", "Upgrade!!!"],
	},
	{
		answer: "Hwei",
		title: "Un peintre qui a dix sorts pour un seul pinceau.",
		hints: ["Mage.", "Chaque compétence dépend d'un choix.", "Visionary."],
	},
	{
		answer: "Illaoi",
		title: "Ses tentacules d'ombre te montrent une vérité que tu voulais pas voir.",
		hints: ["Toplane.", "Arrache l'esprit de ses ennemis.", "Leap of Faith."],
	},
	{
		answer: "Irelia",
		title: "Des lames qui dansent et un dash qui n'attend jamais son tour.",
		hints: ["Toplane.", "Manipule des lames.", "Vanguard's Edge."],
	},
	{
		answer: "Ivern",
		title: "Le seul jungler qui préfère câliner les monstres plutôt que les taper.",
		hints: ["Support jungle.", "Libère les camps.", "Daisy."],
	},
	{
		answer: "Janna",
		title: "Un souffle de vent, et ton engage part en fumée.",
		hints: ["Support.", "Contrôle énormément les déplacements.", "Monsoon."],
	},
	{
		answer: "Jarvan IV",
		title: "Le prince qui t'enferme dans son mur avant que tu comprennes le plan.",
		hints: ["Jungler.", "Combo drapeau + lance.", "Cataclysm."],
	},
	{
		answer: "Jax",
		title: "Une lampe torche comme arme, et pourtant ça fait très mal.",
		hints: ["Toplane.", "Évite les attaques de base.", "Counter Strike."],
	},
	{
		answer: "Jayce",
		title: "Marteau ou canon, il refuse juste de choisir un seul kit.",
		hints: [
			"Originaire de Piltover.",
			"Peut changer d'arme instantanément.",
			"Mercury Cannon.",
		],
	},
	{
		answer: "Jhin",
		title: "Un tueur qui compte ses balles comme un metteur en scène compte ses actes.",
		hints: [
			"ADC.",
			"Recharge après un certain nombre de tirs.",
			"Le chiffre 4 est partout.",
		],
	},
	{
		answer: "Jinx",
		title: "Le chaos incarné, en rose et complètement cracked.",
		hints: ["ADC.", "Change entre deux armes.", "Super Mega Death Rocket!"],
	},
	{
		answer: "K'Sante",
		title: "Le protecteur de Nazumah qui balance son bouclier pour tout finir.",
		hints: ["Toplane.", "Tank qui peut devenir bruiser.", "All Out."],
	},
	{
		answer: "Kai'Sa",
		title: "Née du Néant, elle attend juste que tu baisses ta garde.",
		hints: [
			"ADC.",
			"Évolue ses compétences.",
			"Peut foncer sur une cible marquée.",
		],
	},
	{
		answer: "Kalista",
		title: "L'esprit vengeur qui te fait payer chaque erreur de positionnement.",
		hints: [
			"ADC.",
			"Saute après chaque attaque.",
			"Liée à un allié dès le début.",
		],
	},
	{
		answer: "Karma",
		title: "Une seule enivocatrice, deux fois plus de punch avec son ultime.",
		hints: [
			"Support ou mage.",
			"Renforce ses sorts avec son ultime.",
			"Mantra.",
		],
	},
	{
		answer: "Karthus",
		title: "Sérieusement, pourquoi il fait encore des dégâts après être mort ?",
		hints: ["Mage.", "Inflige encore des dégâts après sa mort.", "Requiem."],
	},
	{
		answer: "Kassadin",
		title: "Un chasseur de vide qui devient carrément op passé trente minutes.",
		hints: ["Mage assassin.", "Très fort en fin de partie.", "Riftwalk."],
	},
	{
		answer: "Katarina",
		title: "Une dague au sol, et soudain elle est déjà sur toi.",
		hints: ["Assassin AP.", "Reset sur les éliminations.", "Death Lotus."],
	},
	{
		answer: "Kayle",
		title: "Faible en early, terrifiante quand elle sort enfin ses ailes.",
		hints: [
			"Toplane.",
			"Devient de plus en plus puissante avec les niveaux.",
			"Divine Judgment.",
		],
	},
	{
		answer: "Kayn",
		title: "Un choix à faire : la faucheuse discrète, ou le démon qui explose tout.",
		hints: ["Jungler.", "Deux formes possibles.", "Shadow Assassin ou Rhaast."],
	},
	{
		answer: "Kennen",
		title: "Le yordle électrique qui stun toute une équipe d'un coup.",
		hints: ["Toplane.", "Accumule des marques.", "Slicing Maelstrom."],
	},
	{
		answer: "Kha'Zix",
		title: "Un prédateur du Néant qui adore les proies qui jouent en solo.",
		hints: [
			"Jungler assassin.",
			"Évolue ses compétences.",
			"Taste Their Fear.",
		],
	},
	{
		answer: "Kindred",
		title: "La mort et le loup, indissociables et toujours de sortie ensemble.",
		hints: ["Jungle.", "Marque des cibles.", "Lamb et Wolf."],
	},
	{
		answer: "Kled",
		title: "Un vieux grincheux qui charge sur sa monture, courage compris ou pas.",
		hints: ["Toplane.", "Combat avec Skaarl.", "Charge toute son équipe."],
	},
	{
		answer: "Kog'Maw",
		title: "Une créature du Néant qui dissout tes plaques d'armure à distance.",
		hints: ["ADC.", "Très fort contre les tanks.", "Bio-Arcane Barrage."],
	},
	{
		answer: "LeBlanc",
		title: "Un miroir, une illusion, et toi qui frappes le mauvais clone.",
		hints: ["Mage assassin.", "Peut créer un clone.", "Distortion."],
	},
	{
		answer: "Lee Sin",
		title: "Le moine aveugle dont chaque highlight commence par un kick vers la base.",
		hints: ["Jungler.", "Ward Hop.", "Dragon's Rage."],
	},
	{
		answer: "Leona",
		title: "L'aube solaire qui stun avant même que tu réalises qu'elle a engagé.",
		hints: ["Support tank.", "Très riche en contrôles.", "Solar Flare."],
	},
	{
		answer: "Lillia",
		title: "Une timide qui préfère fuir en courant plutôt qu'affronter qui que ce soit.",
		hints: [
			"Jungle AP.",
			"Accumule énormément de vitesse.",
			"Lilting Lullaby.",
		],
	},
	{
		answer: "Lissandra",
		title: "Se rendre invulnérable en s'enfermant dans la glace, quelle stratégie.",
		hints: ["Mage.", "Peut se rendre invulnérable.", "Frozen Tomb."],
	},
	{
		answer: "Lucian",
		title: "Un chasseur qui tire deux fois pour être bien sûr du résultat.",
		hints: ["ADC.", "Très mobile.", "The Culling."],
	},
	{
		answer: "Lulu",
		title: "Une fée farceuse qui décide qui devient une créature géante intuable.",
		hints: ["Support.", "Transforme ses ennemis.", "Wild Growth."],
	},
	{
		answer: "Lux",
		title: "Un rayon lumineux qui traverse toute la lane sans prévenir.",
		hints: ["Mage.", "Très longue portée.", "Final Spark."],
	},
	{
		answer: "Malphite",
		title: "Un tas de cailloux qui débarque de nulle part pour tout aplatir.",
		hints: [
			"Tank.",
			"Très fort contre les dégâts physiques.",
			"Unstoppable Force.",
		],
	},
	{
		answer: "Malzahar",
		title: "Une stratégie limpide : suppression pure et invocation de vermine.",
		hints: ["Mage.", "Invoque des créatures du Néant.", "Nether Grasp."],
	},
	{
		answer: "Maokai",
		title: "Un arbre tank pour qui les buissons n'ont jamais été un endroit sûr.",
		hints: ["Tank.", "Lance des jeunes pousses.", "Nature's Grasp."],
	},
	{
		answer: "Master Yi",
		title: "Un adepte du Wuju qui punit sévèrement les équipes qui restent groupées.",
		hints: ["Jungler.", "Très fort en nettoyage de teamfight.", "Highlander."],
	},
	{
		answer: "Milio",
		title: "Le petit soleil de sa famille qui rend ton ADC franchement injouable.",
		hints: ["Support.", "Augmente la portée des alliés.", "Breath of Life."],
	},
	{
		answer: "Miss Fortune",
		title: "Une capitaine dont la pluie de balles n'épargne jamais les groupés.",
		hints: ["ADC.", "Très forte en zone.", "Bullet Time."],
	},
	{
		answer: "Mordekaiser",
		title: "Le seigneur des ombres qui t'invite à un duel dont tu ne reviens pas.",
		hints: ["Toplane.", "Isole un ennemi.", "Realm of Death."],
	},
	{
		answer: "Morgana",
		title: "Une déchue aux ailes noires qui annule ton engage d'un simple bouclier.",
		hints: ["Support ou mage.", "Immobilisation très longue.", "Black Shield."],
	},
	{
		answer: "Naafiri",
		title: "Cent corps, un seul esprit, et jamais loin de sa meute.",
		hints: ["Assassin.", "Combat avec sa meute.", "The Call of the Pack."],
	},
	{
		answer: "Nami",
		title: "Une sirène dont la vague pousse toute l'équipe adverse au mauvais endroit.",
		hints: ["Support.", "Contrôle l'eau.", "Tidal Wave."],
	},
	{
		answer: "Nasus",
		title: "Plus la game s'étire, plus son coup basique fait mal.",
		hints: ["Toplane.", "Accumule des stacks.", "Siphoning Strike."],
	},
	{
		answer: "Nautilus",
		title: "Une ancre qui te trouve peu importe où tu te caches.",
		hints: ["Support tank.", "Très riche en contrôles.", "Depth Charge."],
	},
	{
		answer: "Neeko",
		title: "Ce coéquipier bizarre pourrait très bien ne pas en être un.",
		hints: ["Mage.", "Peut prendre l'apparence d'un allié.", "Pop Blossom."],
	},
	{
		answer: "Nidalee",
		title: "Chasseresse le jour, cougar tout le temps.",
		hints: ["Jungle.", "Deux formes.", "Cougar Form."],
	},
	{
		answer: "Nilah",
		title: "Une lame liquide qui vole de la vie à tout ce qui l'entoure.",
		hints: [
			"ADC.",
			"Corps à corps.",
			"Apporte de l'expérience supplémentaire.",
		],
	},
	{
		answer: "Nocturne",
		title: "Quand l'écran devient noir autour de toi, panique légitime.",
		hints: ["Jungler.", "Éteint la vision de toute la map.", "Paranoia."],
	},
	{
		answer: "Nunu & Willump",
		title: "Un enfant et son yéti qui font grossir une simple boule de neige jusqu'à l'absurde.",
		hints: ["Jungler.", "Très fort sur les objectifs.", "Absolute Zero."],
	},
	{
		answer: "Olaf",
		title: "Plus il est bas en vie, moins les contrôles l'affectent.",
		hints: ["Bruiser.", "Lance des haches.", "Ragnarok."],
	},
	{
		answer: "Orianna",
		title: "Une balle mécanique, et tout le monde dans son rayon regrette d'être venu.",
		hints: ["Mage.", "Contrôle une sphère.", "Shockwave."],
	},
	{
		answer: "Ornn",
		title: "Le forgeron divin qui upgrade tes objets sans même que tu bouges.",
		hints: ["Tank.", "Peut améliorer des objets.", "Call of the Forge God."],
	},
	{
		answer: "Pantheon",
		title: "Un guerrier qui préfère atterrir directement sur ta tête depuis le ciel.",
		hints: ["Bruiser.", "Bloque les dégâts devant lui.", "Grand Starfall."],
	},
	{
		answer: "Poppy",
		title: "Une yordle au marteau qui déteste particulièrement les gros dashs.",
		hints: ["Tank.", "Peut empêcher les déplacements.", "Steadfast Presence."],
	},
	{
		answer: "Pyke",
		title: "L'éventreur des profondeurs dont les exécutions financent toute l'équipe.",
		hints: ["Support assassin.", "Reset son ultime.", "Death From Below."],
	},
	{
		answer: "Qiyana",
		title: "Une princesse d'Ixtal qui transforme le terrain lui-même en arme.",
		hints: [
			"Assassin.",
			"Manipule les éléments.",
			"Supreme Display of Talent.",
		],
	},
	{
		answer: "Quinn",
		title: "Une éclaireuse démacienne jamais bien loin de son faucon Valor.",
		hints: ["Toplane ou ADC.", "Combat avec Valor.", "Behind Enemy Lines."],
	},
	{
		answer: "Rakan",
		title: "Le charmeur qui engage en dansant et repart avant que tu comprennes.",
		hints: ["Support.", "Très mobile autour de ses alliés.", "The Quickness."],
	},
	{
		answer: "Rammus",
		title: "Ok.",
		hints: ["Tank.", "Se déplace en boule.", "Ok."],
	},
	{
		answer: "Rek'Sai",
		title: "Une terreur du Néant qui te chope même sous la carte.",
		hints: ["Jungler.", "Creuse des tunnels.", "Void Rush."],
	},
	{
		answer: "Rell",
		title: "Une chevalière dissidente au métal vivant qui n'engage jamais discrètement.",
		hints: ["Support tank.", "Contrôle le métal.", "Magnet Storm."],
	},
	{
		answer: "Renata Glasc",
		title: "La chimiste de Zaun qui retourne carrément ton propre camp contre toi.",
		hints: [
			"Support.",
			"Peut ressusciter temporairement.",
			"Hostile Takeover.",
		],
	},
	{
		answer: "Renekton",
		title: "Un croco enragé qui punit très fort les early games trop tranquilles.",
		hints: ["Toplane.", "Utilise une barre de Fureur.", "Dominus."],
	},
	{
		answer: "Rengar",
		title: "Le chasseur du buisson pour qui aucune proie n'est vraiment en sécurité.",
		hints: ["Assassin.", "Bondit sur ses cibles.", "Thrill of the Hunt."],
	},
	{
		answer: "Riven",
		title: "Une exilée noxienne au fragment d'épée brisée, et pourtant carrément cracked.",
		hints: ["Toplane.", "Épée brisée.", "Blade of the Exile."],
	},
	{
		answer: "Rumble",
		title: "Un yordle mécanicien dont la jauge de chaleur décide de tout.",
		hints: ["Toplane.", "Gère une jauge de chaleur.", "The Equalizer."],
	},
	{
		answer: "Ryze",
		title: "Le mage errant obsédé par des Runes plus que par sa propre win rate.",
		hints: ["Mage.", "Cherche les Runes.", "Realm Warp."],
	},
	{
		answer: "Samira",
		title: "Le style avant tout, sinon le combo ne compte pas vraiment.",
		hints: ["ADC.", "Accumule un style de combat.", "Inferno Trigger."],
	},
	{
		answer: "Sejuani",
		title: "Une cheffe de guerre qui préfère régler ça avec un sanglier gelé.",
		hints: [
			"Jungler tank.",
			"Combat sur un énorme sanglier.",
			"Glacial Prison.",
		],
	},
	{
		answer: "Senna",
		title: "Une tireuse d'élite qui récupère littéralement les âmes de ses victimes.",
		hints: ["Support ou ADC.", "Ramasse des âmes.", "Dawning Shadow."],
	},
	{
		answer: "Seraphine",
		title: "Une popstar de Zaun-Piltover dont l'ultime adore les foules nombreuses.",
		hints: ["Mage / Support.", "Très forte en teamfight.", "Encore."],
	},
	{
		answer: "Sett",
		title: "Le patron qui règle tout à mains nues, littéralement.",
		hints: ["Toplane.", "Très fort au corps à corps.", "The Show Stopper."],
	},
	{
		answer: "Shaco",
		title: "Le clown démoniaque : ce que t'as vu n'était probablement pas lui.",
		hints: ["Assassin.", "Pose des boîtes.", "Hallucinate."],
	},
	{
		answer: "Shen",
		title: "Un ninja de l'Ordre du Kinkou qui débarque en renfort à la vitesse de la lumière.",
		hints: [
			"Toplane.",
			"Peut rejoindre un allié instantanément.",
			"Stand United.",
		],
	},
	{
		answer: "Shyvana",
		title: "Une demi-dragonne dont la vraie forme arrive toujours au meilleur moment.",
		hints: [
			"Jungle.",
			"Très dépendante de sa forme ultime.",
			"Dragon's Descent.",
		],
	},
	{
		answer: "Singed",
		title: "Le kite le plus détesté du jeu, en version chimiste toxique.",
		hints: ["Toplane.", "Laisse une traînée de poison.", "Insanity Potion."],
	},
	{
		answer: "Sion",
		title: "Ce mort-vivant refuse de comprendre qu'il n'a plus de tête.",
		hints: ["Tank.", "Peut foncer sur toute la map.", "Unstoppable Onslaught."],
	},
	{
		answer: "Sivir",
		title: "Une mercenaire dont le bouclier renvoie littéralement les sorts adverses.",
		hints: ["ADC.", "Possède un bouclier anti-sort.", "Ricochet."],
	},
	{
		answer: "Skarner",
		title: "Un scorpion de cristal, une queue, et une envoyée directe dans ta base.",
		hints: ["Jungler.", "Capture une cible.", "Impale."],
	},
	{
		answer: "Smolder",
		title: "Un bébé dragon qui grandit à chaque stack jusqu'à devenir un vrai cauchemar.",
		hints: ["ADC.", "Devient plus fort avec ses stacks.", "MMOOOMMMM!"],
	},
	{
		answer: "Sona",
		title: "Elle ne dit jamais un mot, et pourtant toute la lane l'entend jouer.",
		hints: ["Support.", "Utilise plusieurs auras.", "Crescendo."],
	},
	{
		answer: "Soraka",
		title: "La licorne céleste que tout le monde adore, sauf les assassins frustrés.",
		hints: [
			"Support.",
			"Sacrifie parfois sa propre vie pour soigner.",
			"Wish.",
		],
	},
	{
		answer: "Swain",
		title: "Le grand général de Noxus, avec des corbeaux qui voient tout à sa place.",
		hints: [
			"Mage de Noxus.",
			"Des corbeaux l'accompagnent partout.",
			"Transforme un teamfight en drain géant.",
		],
	},
	{
		answer: "Sylas",
		title: "Un rebelle de Demacia qui pique carrément l'ultime de l'adversaire.",
		hints: [
			"Mage au corps à corps.",
			"S'échappe facilement avec ses chaînes.",
			"Peut voler les ultimes ennemis.",
		],
	},
	{
		answer: "Syndra",
		title: "Une souveraine des ténèbres qui jongle avec des sphères pas franchement amicales.",
		hints: ["Mage.", "Contrôle des sphères noires.", "Unleashed Power."],
	},
	{
		answer: "Tahm Kench",
		title: "Le crapaud-roi propose son aide, mais version toujours limite louche.",
		hints: ["Support tank.", "Très fort en lane.", "Devour."],
	},
	{
		answer: "Taliyah",
		title: "Une tisse-pierre qui transforme le sol en tapis roulant géant.",
		hints: [
			"Mage.",
			"Contrôle les rochers.",
			"Peut traverser la map avec un mur.",
		],
	},
	{
		answer: "Talon",
		title: "Les murs de la carte ? Une simple formalité pour ce tueur noxien.",
		hints: ["Assassin AD.", "Très mobile sur la map.", "Assassin de Noxus."],
	},
	{
		answer: "Taric",
		title: "Le protecteur du Soleil dont les gemmes rendent toute l'équipe invincible.",
		hints: [
			"Support.",
			"Peut rendre son équipe invulnérable.",
			"Cosmic Radiance.",
		],
	},
	{
		answer: "Teemo",
		title: "Le yordle le plus détesté de Runeterra, sauf quand il est dans ton équipe.",
		hints: [
			"Toplane.",
			"Pose des champignons.",
			"Le capitaine des éclaireurs.",
		],
	},
	{
		answer: "Thresh",
		title: "Le geôlier des âmes dont la lanterne peut aussi bien te sauver que t'achever.",
		hints: ["Support.", "Ramasse les âmes.", "Death Sentence."],
	},
	{
		answer: "Tristana",
		title: "Une yordle canonnière qui envoie sa cible visiter la stratosphère.",
		hints: ["ADC.", "Très forte sur les tours.", "Rocket Jump."],
	},
	{
		answer: "Trundle",
		title: "Un troll des glaces qui pique carrément les stats du tank adverse.",
		hints: ["Bruiser.", "Crée un énorme pilier.", "Subjugate."],
	},
	{
		answer: "Tryndamere",
		title: "Un barbare qui a manifestement zappé le tuto sur la mort.",
		hints: ["Toplane.", "Accumule de la fureur.", "Undying Rage."],
	},
	{
		answer: "Twisted Fate",
		title: "Le magicien des cartes, jamais très clean sur la table de poker.",
		hints: ["Mage.", "Choisit entre trois cartes.", "Destiny."],
	},
	{
		answer: "Twitch",
		title: "Un rat des égouts qui se pointe pile quand tu te crois tranquille.",
		hints: ["ADC.", "Devient invisible.", "Rat-ta-tat-tat."],
	},
	{
		answer: "Udyr",
		title: "Quatre esprits, quatre postures, et zéro besoin d'ultime pour tout péter.",
		hints: ["Jungler.", "Change constamment de posture.", "Le spirit walker."],
	},
	{
		answer: "Urgot",
		title: "Un bourreau de Zaun dont les chaînes ne t'invitent pas à une balade tranquille.",
		hints: ["Toplane.", "Très fort contre les bruisers.", "Fear Beyond Death."],
	},
	{
		answer: "Varus",
		title: "Une flèche corrompue par le Néant, et une deuxième juste derrière.",
		hints: ["ADC.", "Accumule des marques.", "Chain of Corruption."],
	},
	{
		answer: "Vayne",
		title: "Une chasseuse de monstres pour qui les gros tanks sont juste une cible facile.",
		hints: ["ADC.", "Très forte en duel.", "Silver Bolts."],
	},
	{
		answer: "Veigar",
		title: "Un mage minuscule dont le sourire s'agrandit à chaque minute de jeu.",
		hints: ["Mage.", "Accumule de la puissance.", "Primordial Burst."],
	},
	{
		answer: "Vel'Koz",
		title: "Un œil du Néant qui te dissèque avant même de te dire bonjour.",
		hints: [
			"Mage du Néant.",
			"Analyse ses cibles.",
			"Life Form Disintegration Ray.",
		],
	},
	{
		answer: "Vex",
		title: "Une yordle grognon dont même la déprime fait mal aux ennemis.",
		hints: ["Mage.", "Combat avec son ombre.", "Shadow Surge."],
	},
	{
		answer: "Vi",
		title: "Une exécutrice de Piltover, gantelets énormes, patience quasi nulle.",
		hints: ["Jungler.", "Charge son Q.", "Cease and Desist."],
	},
	{
		answer: "Viego",
		title: "Le Roi Déchu vole littéralement le corps de ceux qu'il élimine.",
		hints: ["Jungler.", "Possède les champions ennemis.", "Le Roi Déchu."],
	},
	{
		answer: "Viktor",
		title: "Un scientifique de Zaun qui préfère l'acier à la chair, poste après poste.",
		hints: ["Mage.", "Évolue ses compétences.", "Glorious Evolution."],
	},
	{
		answer: "Vladimir",
		title: "Un hémomancien pour qui la vie de tout le monde est juste une ressource de plus.",
		hints: ["Mage.", "Utilise son propre sang.", "Sanguine Pool."],
	},

	{
		answer: "Warwick",
		title: "Une odeur de sang, et le loup zaunite débarque sans prévenir.",
		hints: [
			"Jungler.",
			"Court plus vite vers les ennemis blessés.",
			"Infinite Duress.",
		],
	},
	{
		answer: "Wukong",
		title: "Un bâton, un clone, et une déferlante de bâtons qui te font tourner en rond.",
		hints: [
			"Top/Jungle.",
			"Peut devenir invisible un court instant.",
			"Cyclone.",
		],
	},
	{
		answer: "Xayah",
		title: "Chaque plume qu'elle laisse tomber prépare la suivante mise à mort.",
		hints: ["ADC.", "Rappelle ses plumes.", "Featherstorm."],
	},
	{
		answer: "Xerath",
		title: "Un mage emprisonné qui te grille à distance depuis deux écrans.",
		hints: ["Mage.", "Très longue portée.", "Arcane Barrage."],
	},
	{
		answer: "Xin Zhao",
		title: "Le sénéchal de Demacia, toujours le premier à sauter dans le combat.",
		hints: ["Jungler.", "Très fort en duel.", "Crescent Guard."],
	},
	{
		answer: "Yasuo",
		title: "Un vent qui souffle, et soudain toute l'équipe adverse s'envole.",
		hints: ["Mid/Top.", "Son ultime nécessite un knock-up.", "Steel Tempest."],
	},
	{
		answer: "Yone",
		title: "Un esprit lié à deux lames qui revient toujours pile à son point de départ.",
		hints: ["Mid/Top.", "Alterne deux épées.", "Soul Unbound."],
	},
	{
		answer: "Yorick",
		title: "Un fossoyeur qui ne se déplace jamais vraiment seul.",
		hints: ["Toplane.", "Invoque des goules.", "Maiden of the Mist."],
	},
	{
		answer: "Yuumi",
		title: "Le chat magique dont le meilleur move est de se coller à un allié.",
		hints: ["Support.", "Peut devenir inciblable.", "Final Chapter."],
	},
	{
		answer: "Zac",
		title: "Une gelée zaunite qui rebondit dans toute l'équipe, morceaux compris.",
		hints: [
			"Tank.",
			"Ramasse ses morceaux pour se soigner.",
			"Elastic Slingshot.",
		],
	},
	{
		answer: "Zed",
		title: "L'ombre qu'on aperçoit une fraction de seconde avant que tout devienne noir.",
		hints: ["Assassin AD.", "Utilise des ombres.", "Death Mark."],
	},
	{
		answer: "Zeri",
		title: "Une électro-punkette de Zaun dont même l'attaque de base est un vrai sort.",
		hints: ["ADC.", "Très mobile.", "Son attaque de base est un sort."],
	},
	{
		answer: "Ziggs",
		title: "Un yordle qui répond à absolument toutes les questions par une bombe.",
		hints: ["Mage.", "Excellent contre les tours.", "Mega Inferno Bomb."],
	},
	{
		answer: "Zilean",
		title: "Un chronomancien qui garde toujours une seconde vie en réserve.",
		hints: ["Support/Mage.", "Peut ressusciter un allié.", "Chronoshift."],
	},
	{
		answer: "Zoe",
		title: "Une enfant cosmique qui transforme un sort d'invocateur volé en one-shot.",
		hints: [
			"Mage.",
			"Ramasse les sorts d'invocateur.",
			"Sleepy Trouble Bubble.",
		],
	},
	{
		answer: "Zyra",
		title: "Une plante carnivore version champion : le buisson d'à côté n'est jamais innocent.",
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
	/**
	 * Vrai pendant le changement de round : masque le splash instantanement
	 * (transition CSS coupee) jusqu'au `load` de la nouvelle image. Sans ca, la
	 * nouvelle image apparait en clair ~1s le temps que le deflou du round
	 * precedent se re-applique en sens inverse.
	 */
	protected splashSwapping = signal(false);
	protected lastGain = signal(0);
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
			if (this.destroyed) return;
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
		this.splashSwapping.set(true);
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
		this.splashSwapping.set(true);
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
