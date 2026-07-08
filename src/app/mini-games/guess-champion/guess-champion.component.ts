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
	hints: string[];
}

const ROUNDS: GuessRound[] = [
	{
		answer: "Aatrox",
		hints: [
			"Guerre oubliée, camp perdu.",
			"Jadis lumière, aujourd'hui haine.",
			"Colosse ailé de ténèbres.",
			"Se soigne en frappant.",
			"Épée aussi grande que lui.",
		],
	},
	{
		answer: "Ahri",
		hints: [
			"Renard sous forme humaine.",
			"Charme irrésistible, danger latent.",
			"Esprit de neuf queues.",
			"Mage rusé, séductrice experte.",
			"Billes bioluminescentes lancinantes.",
		],
	},
	{
		answer: "Akali",
		hints: [
			"Nuit éternelle, danger latent.",
			"Mystérieuse ombre d'acier.",
			"Rapide comme l'éclair.",
			"Maître des arts cachés.",
			"Assassin à la double faucille.",
		],
	},
	{
		answer: "Akshan",
		hints: [
			"Justicier mystérieux.",
			"Regards ardents, allure nonchalante.",
			"Toujours à la recherche.",
			"Un grappin en bandoulière.",
			"Ressuscite les alliés tombés.",
		],
	},
	{
		answer: "Alistar",
		hints: [
			"Puissance indomptable, cœur de lion.",
			"Bêtes d'arène gigantesques.",
			"Îles flottes, mémoire d'esclavage.",
			"Énorme, cornes acérées.",
			"Charge renversante.",
		],
	},
	{
		answer: "Amumu",
		hints: [
			"Momie sans âge, pleurs éternels.",
			"Solitude muette, cœur brisé.",
			"Petite silhouette pathétique.",
			"Étreintes désespérées de bandages.",
			"Larmes qui enchaînent les ennemis.",
		],
	},
	{
		answer: "Anivia",
		hints: [
			"Garde de glace éternelle.",
			"Renaissance immaculée.",
			"Esprits du nord.",
			"Tempête incarnée.",
			"Cristal de glace ailé.",
		],
	},
	{
		answer: "Annie",
		hints: [
			"Esprits ardents et mystères en forêt.",
			"Jeune orpheline, pouvoir dévastateur.",
			"Pyromancienne à couettes.",
			"Ours de feu fidèle.",
			"Dangers en peluche brûlante.",
		],
	},
	{
		answer: "Aphelios",
		hints: [
			"Silence face à la lune.",
			"Jumeaux liés par le destin.",
			"Mains habiles et précises.",
			"Cinq armes sous la nuit.",
			"Assassin muet, sœurs protectrices.",
		],
	},
	{
		answer: "Ashe",
		hints: [
			"Flocons éternels.",
			"Archer du nord lointain.",
			"Précision glaciale.",
			"Flèche gelée à longue portée.",
			"Reine des Glaces Freljordienne.",
		],
	},
	{
		answer: "Aurelion Sol",
		hints: [
			"Création et destruction céleste.",
			"Voix résonnante parmi les étoiles.",
			"Majesté sinaître des cieux.",
			"Dragon cosmique scintillant.",
			"Maître des cieux de Targon.",
		],
	},
	{
		answer: "Azir",
		hints: [
			"Sables dorés, empire enfoui.",
			"Passé glorieux, futur incertain.",
			"Gardien de l'héritage shurimien.",
			"Commandant d'armées de sable.",
			"Ressuscite un empire déchu.",
		],
	},
	{
		answer: "Bard",
		hints: [
			"Gardien des étoiles lointaines.",
			"Mélodies d'une autre époque.",
			"Rôdeur entre les mondes.",
			"Clochettes pour alliés perdus.",
			"Portes magiques dans le néant.",
		],
	},
	{
		answer: "Bel'Veth",
		hints: [
			"Profondeurs insondables, terreur ancienne.",
			"Mutation infinie, faim insatiable.",
			"Marée de tentacules ondulants.",
			"Régente des abysses déchaînés.",
			"Voix des Éternités du Vide.",
		],
	},
	{
		answer: "Blitzcrank",
		hints: [
			"Machine animée par magie.",
			"Silhouette massive et cliquetante.",
			"Force brute, vitesse surprenante.",
			"Main extensible à l'infini.",
			"Ramène tout adversaire à lui.",
		],
	},
	{
		answer: "Brand",
		hints: [
			"Ancienne flamme, nouveau brasier.",
			"Esprit ardent, cœur consumé.",
			"Flammes qui consument tout.",
			"Pyromancien au tempérament volcanique.",
			"Ultime tempête de feu.",
		],
	},
	{
		answer: "Braum",
		hints: [
			"Conte du nord glacé.",
			"Force tranquille au bouclier.",
			"Barbu au cœur chaleureux.",
			"Protecteur de lames gelées.",
			"Bouclier aussi large qu'un mur.",
		],
	},
	{
		answer: "Briar",
		hints: [
			"Faim insatiable, contrôle difficile.",
			"Des chaînes pour la contenir.",
			"Créature de la nuit.",
			"Transformation partielle en combat.",
			"Jungle, soif de sang.",
		],
	},
	{
		answer: "Caitlyn",
		hints: [
			"Chapeau haut de forme.",
			"Détective en mission.",
			"Tireuse d'élite de Piltover.",
			"Fusil à longue portée.",
			"Pièges à cupcakes.",
		],
	},
	{
		answer: "Camille",
		hints: [
			"Ombres dans la nuit.",
			"Griffes acérées, regard perçant.",
			"Lames tranchantes des bas-fonds.",
			"Chasseuse de l'ordre implacable.",
			"Jambes meurtrières d'acier.",
		],
	},
	{
		answer: "Cassiopeia",
		hints: [
			"Envoûtante et dangereuse.",
			"Beauté sculptée dans le vice.",
			"Angoisse serpentine qui siffle.",
			"Embrasement toxique du regard.",
			"Transformation en pierre du regard.",
		],
	},
	{
		answer: "Cho'Gath",
		hints: [
			"Rugissement de l'inconnu.",
			"Terreur venue des profondeurs.",
			"Prédateur insatiable.",
			"Croît en dévorant.",
			"Griffes, crocs et centaines de dents.",
		],
	},
	{
		answer: "Corki",
		hints: [
			"Maître du ciel nocturne.",
			"Aéronef incontrôlable.",
			"Pilote yordle zélé.",
			"Bombes et roquettes partout.",
			"Vol sur machine volante.",
		],
	},
	{
		answer: "Darius",
		hints: [
			"Martial, brutal.",
			"Ombre du tyran.",
			"Hache sans pitié.",
			"Les Noxiens le craignent.",
			"Exécutions sanglantes, sans remords.",
		],
	},
	{
		answer: "Diana",
		hints: [
			"Lune double et mystique.",
			"Ombres et révélations nocturnes.",
			"Protectrice sacrée au cœur pur.",
			"Lames croissantes, tranchant argenté.",
			"Lunari dévouée, éclaire la nuit.",
		],
	},
	{
		answer: "Dr. Mundo",
		hints: [
			"Folie et chaos incarnés.",
			"Cerveau pas toujours allumé.",
			"Brutesse molle, langage simple.",
			"La douleur, il adore.",
			"Scalpel géant violet.",
		],
	},
	{
		answer: "Draven",
		hints: [
			"Frère de l'ombre.",
			"Triomphes et exécutions.",
			"Lame tournant sous les projecteurs.",
			"Attraper, lancer, recommencer.",
			"Gloire et spectacle dans Noxus.",
		],
	},
	{
		answer: "Ekko",
		hints: [
			"Horloges brisées, temps altéré.",
			"Ombres de l'avenir.",
			"Génie adolescent de Zaun.",
			"Retour au passé immédiat.",
			"Dagues et engrenages repères.",
		],
	},
	{
		answer: "Elise",
		hints: [
			"Métamorphose en silhouette arachnéenne.",
			"Rituels anciens dans la jungle.",
			"Beauté trompeuse et mortelle.",
			"Descendante des tisseurs de toiles.",
			"Reine araignée de l'ombre.",
		],
	},
	{
		answer: "Evelynn",
		hints: [
			"Ombres séduisantes, murmures envoûtants.",
			"Douce affliction, plaisir interdit.",
			"Faufilement, en chasseresse nocturne.",
			"Séduction fatale, lames affûtées.",
			"Démon caché, caresse mortelle.",
		],
	},
	{
		answer: "Ezreal",
		hints: [
			"Explorateur intrépide.",
			"Archéologue de l'extrême.",
			"Charmeur blond à souhait.",
			"Aventurier des contrées antiques.",
			"Tireur d'élite magique.",
		],
	},
	{
		answer: "Fiddlesticks",
		hints: [
			"Terreur ancestrale des champs.",
			"Chuchotement du vent nocturne.",
			"Essence du cauchemar.",
			"Épouvantail à double faux.",
			"Moisson de peur ultime.",
		],
	},
	{
		answer: "Fiora",
		hints: [
			"Duel sous le soleil couchant.",
			"Épée en quête de perfection.",
			"Chasseur de faiblesses.",
			"Maîtresse des ripostes.",
			"Escrimeuse du royaume Demacia.",
		],
	},
	{
		answer: "Fizz",
		hints: [
			"Rires dans la tempête.",
			"Esprit espiègle des mers.",
			"Petit trident toujours prêt.",
			"Maîtrise de l'eau assassine.",
			"Poisson géant bondissant.",
		],
	},
	{
		answer: "Galio",
		hints: [
			"Gardien immobile, promesse de pierre.",
			"Grande ombre sur les ruelles.",
			"Géant protecteur de lumière.",
			"Neutralise la magie hostile.",
			"Défenseur de Demacia.",
		],
	},
	{
		answer: "Gangplank",
		hints: [
			"Fumée de canon persistante.",
			"Pirate au trésor enfoui.",
			"Citron, remède préféré.",
			"Barils explosifs stratégiques.",
			"Lame rouillée et pistolet.",
		],
	},
	{
		answer: "Garen",
		hints: [
			"Vétéran aux pas lourds.",
			"Héritier d'une longue lignée.",
			"Défenseur de Demacia.",
			"Tourbillonne avec sa lame.",
			"Crie et exécute.",
		],
	},
	{
		answer: "Gnar",
		hints: [
			"Petit ancêtre oublié.",
			"Rires et grognements sauvages.",
			"Artéfact de glace et rage.",
			"Transformation incontrôlable et puissante.",
			"Minuscule, puis gigantesque.",
		],
	},
	{
		answer: "Gragas",
		hints: [
			"Amateur de mythes anciens.",
			"Marches titubantes, rires rauques.",
			"Adepte de la fermentation.",
			"Tonneau à ses côtés.",
			"Boisson explosive, corps massif.",
		],
	},
	{
		answer: "Graves",
		hints: [
			"Cendrier toujours plein.",
			"Cartes et dés pipés.",
			"Scène enfumée, coups sourds.",
			"Fusil double canon dévastateur.",
			"Complice d'un certain Twisted Fate.",
		],
	},
	{
		answer: "Gwen",
		hints: [
			"Création d'un artisan disparu.",
			"Âme tissée dans un jouet.",
			"Danse effilée sur le champ.",
			"Flous et piqués pour couper.",
			"Ciseaux géants et magiques.",
		],
	},
	{
		answer: "Hecarim",
		hints: [
			"Spectre cavalier des ténèbres.",
			"Fouille les champs de bataille.",
			"Marcheur du Royaume des Ombres.",
			"Charge furieuse dévastatrice.",
			"Centaur au galop infernal.",
		],
	},
	{
		answer: "Heimerdinger",
		hints: [
			"Gnome au passé ancien.",
			"Sciences parfois dangereuses.",
			"Inventeur de génie.",
			"Tourelles miniatures déployables.",
			"Poilu, moustache excentrique.",
		],
	},
	{
		answer: "Hwei",
		hints: [
			"Guerrière aux flèches volantes.",
			"Pêcheuse de rêves tordus.",
			"Maîtrise le boomerang.",
			"Régente d'un futur incertain.",
			"Maître de l'arc lunaire.",
		],
	},
	{
		answer: "Illaoi",
		hints: [
			"Océan tumultueux, croyance profonde.",
			"Statues, tentacules, épreuves divines.",
			"Garde une relique sacrée.",
			"Invoke des appendices pour frapper.",
			"Prêtresse du kraken.",
		],
	},
	{
		answer: "Irelia",
		hints: [
			"Danse de la guerre.",
			"Rythme et grâce.",
			"Lames flottantes en harmonie.",
			"Danseuse de lames redoutable.",
			"Maîtresse des lames ioniennes.",
		],
	},
	{
		answer: "Ivern",
		hints: [
			"Esprits et rêves sylvestres.",
			"Gardien des anciennes forêts.",
			"Ami des créatures sauvages.",
			"Arbrisseau à chaque pas.",
			"La jungle sans violence.",
		],
	},
	{
		answer: "Janna",
		hints: [
			"Brise rafraîchissante.",
			"Gardienne éthérée des cieux.",
			"Vent protecteur et bienfaiteur.",
			"Cyclone repoussoir.",
			"Maîtresse des tempêtes.",
		],
	},
	{
		answer: "Jarvan IV",
		hints: [
			"Sang royal, destin gravé.",
			"Honneur et gloire éternels.",
			"Fidèle au trône.",
			"Saut héroïque en bataille.",
			"Lance d'acier, bouclier doré.",
		],
	},
	{
		answer: "Jax",
		hints: [
			"Guerrier à la retraite.",
			"Maître des armes anciennes.",
			"Aucun match jamais perdu.",
			"Lanterne illuminée en main.",
			"Combattant invaincu à trois doigts.",
		],
	},
	{
		answer: "Jayce",
		hints: [
			"Visionnaire ambitieux.",
			"Technologie en évolution.",
			"Génie de l'ingénierie.",
			"Marteau qui électrise.",
			"Défenseur de Piltover.",
		],
	},
	{
		answer: "Jhin",
		hints: [
			"Échos sur scène.",
			"Quatrième acte tragique.",
			"Masque de l'artiste fou.",
			"Tireur d'élite immobile.",
			"Danse macabre à chaque tir.",
		],
	},
	{
		answer: "Jinx",
		hints: [
			"Folie joyeuse, chaos coloré.",
			"Sourire dément, regards fous.",
			"Munitions en forme de poisson.",
			"Reine des explosifs de Piltover.",
			"Fusil et lance-roquettes.",
		],
	},
	{
		answer: "K'Sante",
		hints: [
			"Porteur de la tradition.",
			"Défenseur d'une cité dorée.",
			"Vainqueur des chasseurs de monstres.",
			"Bouclier qui repousse et attire.",
			"Armes rétractables, double impact.",
		],
	},
	{
		answer: "Kai'Sa",
		hints: [
			"Née des ténèbres.",
			"Symbiose improbable.",
			"Chasse au mépris du danger.",
			"Attaques plasmiques singulières.",
			"Échos du Néant.",
		],
	},
	{
		answer: "Kalista",
		hints: [
			"Revanche d'outre-tombe.",
			"Lame vengeresse.",
			"Fidélité jurée éternelle.",
			"Lance spectrale perçante.",
			"Double saut spectral.",
		],
	},
	{
		answer: "Karma",
		hints: [
			"Équilibre spirituel éternel.",
			"Chuchotements d'une ancienne âme.",
			"Guide de l'harmonie.",
			"Liens spirituels invisibles.",
			"Mantras puissants et apaisants.",
		],
	},
	{
		answer: "Karthus",
		hints: [
			"Chanteur de la fin.",
			"Messager des ombres.",
			"Maître du Requiem.",
			"Mort omniprésente.",
			"Explosion mondiale assurée.",
		],
	},
	{
		answer: "Kassadin",
		hints: [
			"Marcheur des temps perdus.",
			"Ombre dans le vide.",
			"Empaleur silencieux.",
			"Voyageur interdimensionnel.",
			"Maître des failles occultes.",
		],
	},
	{
		answer: "Katarina",
		hints: [
			"Jalousie dans l'ombre.",
			"Poignards dans la nuit.",
			"Tourbillons mortels au combat.",
			"Fille d'un général inflexible.",
			"Rouge flamboyant, cheveux et lames.",
		],
	},
	{
		answer: "Kayle",
		hints: [
			"Flammes célestes dans l'ombre.",
			"Justice en double visage.",
			"Ailes dorées divines.",
			"Épée flamboyante purificatrice.",
			"Invulnérabilité divine ultime.",
		],
	},
	{
		answer: "Kayn",
		hints: [
			"Deux âmes en lutte.",
			"Marche entre ombre et lumière.",
			"Faucheur ou guerrier rouge.",
			"Danse dans les murs.",
			"Faux assoiffée de pouvoir.",
		],
	},
	{
		answer: "Kennen",
		hints: [
			"Tempête imminente, électricité latente.",
			"Foudre vivante, petit mais puissant.",
			"Lanceur de shurikens rapide.",
			"Maître de l'orage ninja.",
			"Yordle au pouvoir statique.",
		],
	},
	{
		answer: "Kha'Zix",
		hints: [
			"Prédateur nocturne silencieux.",
			"Maître des ombres mouvantes.",
			"Évolution incessante et stratégique.",
			"Saut mortel et dévastateur.",
			"Dévoreur des isolés.",
		],
	},
	{
		answer: "Kindred",
		hints: [
			"Danse entre deux mondes.",
			"Fable de vie et mort.",
			"Duo inséparable, loup et agneau.",
			"Marque la proie d'un symbole.",
			"Ne craint pas la grande faucheuse.",
		],
	},
	{
		answer: "Kled",
		hints: [
			"Hargneux et belliqueux.",
			"Duel et chaos organisés.",
			"Monture capricieuse.",
			"Agresse près des tours.",
			"Monté avec un petit lézard.",
		],
	},
	{
		answer: "Kog'Maw",
		hints: [
			"Curiosité insatiable, faim dévorante.",
			"Créature de l'Outre-Monde.",
			"Acide et corrosif.",
			"Tir à distance croissant.",
			"Tireur à mâchoire béante.",
		],
	},
	{
		answer: "LeBlanc",
		hints: [
			"Illusions et mystères persistants.",
			"Rumeurs et ombres enchevêtrées.",
			"Maîtresse des faux-semblants.",
			"Échos et reflets de douleur.",
			"Double masqué en parade.",
		],
	},
	{
		answer: "Lee Sin",
		hints: [
			"Moine errant en quête.",
			"Son seigneur est tombé.",
			"Silence et tempête intérieure.",
			"Maître du coup de pied.",
			"Combat les yeux fermés.",
		],
	},
	{
		answer: "Leona",
		hints: [
			"Gardienne de l'aube éternelle.",
			"Lumière contre ténèbres antiques.",
			"Bouclier solaire redoutable.",
			"Défense impénétrable et éclatante.",
			"Ultime étourdissant et aveuglant.",
		],
	},
	{
		answer: "Lillia",
		hints: [
			"Rêves en friche, forêt hantée.",
			"Timidité cachée sous couronne boisée.",
			"Courir, toujours en mouvement.",
			"Sommeil éternel d'un coup.",
			"Fleur de bâton, magie des songes.",
		],
	},
	{
		answer: "Lissandra",
		hints: [
			"Froid éternel, nuit glaciale.",
			"Gardienne de sombres secrets.",
			"Magie noire et gelée.",
			"Reine des glaces.",
			"Contrôle la tempête de glace.",
		],
	},
	{
		answer: "Lucian",
		hints: [
			"Haine et vengeance.",
			"Veuve à ses côtés.",
			"Duel dans la nuit.",
			"Tirs lumineux et rapides.",
			"Pistolets jumeaux sacrés.",
		],
	},
	{
		answer: "Lulu",
		hints: [
			"Fée espiègle de légendes.",
			"Illusions et farces magiques.",
			"Duo inséparable avec Pix.",
			"Charmeuse de créatures étranges.",
			"Transformation en créature géante.",
		],
	},
	{
		answer: "Lux",
		hints: [
			"Lumière parmi les ombres.",
			"Le cœur d'une lignée.",
			"Éclat du crépuscule.",
			"Mage de Demacia.",
			"Faisceau final éblouissant.",
		],
	},
	{
		answer: "Malphite",
		hints: [
			"Pierre céleste tombée.",
			"Fragment d'un plus grand.",
			"Géant rocailleux et solitaire.",
			"Vibre au cœur des montagnes.",
			"Charge brutale et fracassante.",
		],
	},
	{
		answer: "Malzahar",
		hints: [
			"Voix dans le désert.",
			"Prophète des sables ardents.",
			"Portail vers l'inconnu.",
			"Créatures du Néant invoquées.",
			"Maître des anciens secrets.",
		],
	},
	{
		answer: "Maokai",
		hints: [
			"Esprit ancien, bois vivant.",
			"Gardien silencieux, force naturelle.",
			"Protecteur de la forêt.",
			"Arbre en colère.",
			"Jet de sève explosive.",
		],
	},
	{
		answer: "Master Yi",
		hints: [
			"Méditation dans l'ombre.",
			"Vitesse surhumaine, regard perçant.",
			"Méditations et réflexes aiguisés.",
			"Lame dans le silence.",
			"Sabre de Wuju.",
		],
	},
	{
		answer: "Milio",
		hints: [
			"Jeux et rires enfantins.",
			"Flamme au cœur tendre.",
			"Magie de feu bienveillante.",
			"Support aux soins ardents.",
			"Brasero ambulant sous son bras.",
		],
	},
	{
		answer: "Miss Fortune",
		hints: [
			"Rouge passion, regard perçant.",
			"Vengeance au cœur.",
			"Douceur trompeuse, balles mortelles.",
			"Tireuse d'élite impitoyable.",
			"Tir en éventail dévastateur.",
		],
	},
	{
		answer: "Mordekaiser",
		hints: [
			"Âmes perdues, royaume sombre.",
			"Maître de la non-vie.",
			"Armure imposante sur champ de bataille.",
			"Envoie en royaume personnel.",
			"Masse destructrice d'acier.",
		],
	},
	{
		answer: "Morgana",
		hints: [
			"Ailes enchaînées, cœur divisé.",
			"Dualité ténèbres et lumière.",
			"Gardienne vigilante des opprimés.",
			"Maîtrise les liens et ombres.",
			"Sœur rivale, ange déchu.",
		],
	},
	{
		answer: "Naafiri",
		hints: [
			"Ombres mouvantes, ténèbres rampantes.",
			"Chasseur à l'âme éparpillée.",
			"Meute inséparable, esprit partagé.",
			"Assauts synchronisés, unis par instinct.",
			"Matronne des sables affamés.",
		],
	},
	{
		answer: "Nami",
		hints: [
			"Écume et magie.",
			"Chant des marées anciennes.",
			"Guide les vagues.",
			"Ondes curatives puissantes.",
			"Trident de l'océan.",
		],
	},
	{
		answer: "Nasus",
		hints: [
			"Gardien du savoir ancien.",
			"Sagesse au-delà des âges.",
			"Marche parmi les sables.",
			"Force qui croît sans fin.",
			"Forme divine colossale.",
		],
	},
	{
		answer: "Nautilus",
		hints: [
			"Légende des profondeurs.",
			"Gardien silencieux, obscurité marine.",
			"Titane, marche sous les vagues.",
			"Ancre massive pour protéger.",
			"Tank des abysses sous-marins.",
		],
	},
	{
		answer: "Neeko",
		hints: [
			"Esprit espiègle, cœur curieux.",
			"Nature trompeuse, illusion permanente.",
			"Joueuse au camouflage mystique.",
			"Métamorphose en alliée inattendue.",
			"Caméléon arc-en-ciel du Monde Spirituel.",
		],
	},
	{
		answer: "Nidalee",
		hints: [
			"Chasseuse dans la jungle.",
			"Enfant de la nature.",
			"Transformation en prédateur.",
			"Saut acrobatique impressionnant.",
			"Javelot mortel à distance.",
		],
	},
	{
		answer: "Nilah",
		hints: [
			"Lac aux légendes mystérieuses.",
			"Chant des vagues lointaines.",
			"Joie contagieuse et surnaturelle.",
			"Maître de l'épée aquatique.",
			"Chasseuse de démons aquatiques.",
		],
	},
	{
		answer: "Nocturne",
		hints: [
			"Cauchemars incarnés, effroi de la nuit.",
			"Ombres voraces, ténèbres rampantes.",
			"Silhouette fuyante, lame à la main.",
			"Ultime qui plonge l'équipe entière.",
			"Menace aveugle venue du néant.",
		],
	},
	{
		answer: "Nunu & Willump",
		hints: [
			"Montagnes glacées et légende.",
			"Amitié indestructible et innocence.",
			"Deux corps, un seul cœur.",
			"Joueurs de boules de neige.",
			"Dévoreur de jungle affamé.",
		],
	},
	{
		answer: "Olaf",
		hints: [
			"Fureur incontrôlable en bataille.",
			"Guerrier du nord enragé.",
			"Récupère sa vie en frappant.",
			"Inarrêtable quand il charge.",
			"Deux haches, pluie de coups.",
		],
	},
	{
		answer: "Orianna",
		hints: [
			"Valse mécanique, danse en spirale.",
			"Regard vide, mouvements précis.",
			"Inventée pour remplacer une fille.",
			"Maîtresse de la sphère flottante.",
			"Maîtresse des contrôles en zone.",
		],
	},
	{
		answer: "Ornn",
		hints: [
			"Forgeron silencieux.",
			"Montagnes éternelles, solitude.",
			"Artefacts animés par le feu.",
			"Mains d'artisan, roches brûlantes.",
			"Forge des objets pour alliés.",
		],
	},
	{
		answer: "Pantheon",
		hints: [
			"Étoiles éphémères dans la nuit.",
			"Conflit céleste éternel.",
			"Bouclier toujours brandi.",
			"Charge en chute libre.",
			"Lance du firmament.",
		],
	},
	{
		answer: "Poppy",
		hints: [
			"Petit mais costaud.",
			"Cœur vaillant, marteau puissant.",
			"Une mission inachevée.",
			"Bouclier toujours fidèle.",
			"Martelée à Demacia.",
		],
	},
	{
		answer: "Pyke",
		hints: [
			"Profondeurs obscures et sinistres.",
			"Fantôme des eaux.",
			"Ressuscité pour une vengeance sanglante.",
			"Crochet mortel en embuscade.",
			"Tueur de la Faille.",
		],
	},
	{
		answer: "Qiyana",
		hints: [
			"Princesse capricieuse et ambitieuse.",
			"Toute-puissance de la nature.",
			"Maîtrise élémentaire sans pareil.",
			"Assassin royale, coup précis.",
			"Arme en forme de cercle.",
		],
	},
	{
		answer: "Quinn",
		hints: [
			"Rapace guetteur.",
			"Ombre dans le ciel.",
			"Tireuse d'élite acérée.",
			"Voltigeur d'élite Demacian.",
			"Toujours avec son aigle.",
		],
	},
	{
		answer: "Rakan",
		hints: [
			"Danseur né, charme irrésistible.",
			"Sifflements mélodieux des bois.",
			"Maître de l'art de la séduction.",
			"Protection et amour flamboyant.",
			"Jamais sans sa partenaire Xayah.",
		],
	},
	{
		answer: "Rammus",
		hints: [
			"Silence du désert brûlant.",
			"Carapace ancienne, sagesse millénaire.",
			"Mystère roulant, énigme vivante.",
			"Vitesse vertigineuse, roulades folles.",
			"« Ok. » légendaire.",
		],
	},
	{
		answer: "Rek'Sai",
		hints: [
			"Terreur souterraine prête à bondir.",
			"Six sens aiguisés.",
			"Monstre mangeur de surface.",
			"Révèle les tunnels secrets.",
			"La reine des sables mouvants.",
		],
	},
	{
		answer: "Rell",
		hints: [
			"Métal et magie en fusion.",
			"Enfance en captivité.",
			"Chevalière au cœur brisé.",
			"Magnétisme destructeur.",
			"Charge à cheval imparable.",
		],
	},
	{
		answer: "Renata Glasc",
		hints: [
			"Alchimie de l'ambition.",
			"Charme empoisonné en affaires.",
			"Influence mortelle, style raffiné.",
			"Chem-Baron de Zaun.",
			"Ultime qui retourne alliés.",
		],
	},
	{
		answer: "Renekton",
		hints: [
			"Tempête de sable enragée.",
			"Bête du désert.",
			"Frère maudit et perdu.",
			"Laisse tomber la hache.",
			"Croc géant à double lame.",
		],
	},
	{
		answer: "Rengar",
		hints: [
			"Chasseur des ténèbres.",
			"Symbole de la traque.",
			"Maître des embuscades sauvages.",
			"Fierté de la chasse suprême.",
			"Griffe aiguisée, bond létal.",
		],
	},
	{
		answer: "Riven",
		hints: [
			"Passé brisé, chemin de rédemption.",
			"Troubles intérieurs, paix difficile.",
			"Exilée aux cheveux blancs.",
			"Lame brisée, redoutable tranchant.",
			"Maître d'épée d'Ionia.",
		],
	},
	{
		answer: "Rumble",
		hints: [
			"Mécanique improvisée, bricolage de génie.",
			"Tempérament de feu, caractère brûlant.",
			"Pilote un mécha flamboyant.",
			"Barrages ardents, zones brûlantes.",
			"Yordle avec lance-flammes intégré.",
		],
	},
	{
		answer: "Ryze",
		hints: [
			"Ancien et sagace ermite.",
			"Voyageur des arcanes obscurs.",
			"Tomes et parchemins en mains.",
			"Maîtrise absolue des runes.",
			"Puissante explosion d'énergie bleue.",
		],
	},
	{
		answer: "Samira",
		hints: [
			"Feu et poussière.",
			"Grande Gueule, grand style.",
			"Cascade de projectiles mortels.",
			"Esquive le danger sans effort.",
			"Épée et pistolets mêlés.",
		],
	},
	{
		answer: "Sejuani",
		hints: [
			"Dame des nuits glaciales.",
			"Froid mordant et impitoyable.",
			"Héritière d'une tribu redoutée.",
			"Charge implacable à dos de bête.",
			"Masse à pointes redoutable.",
		],
	},
	{
		answer: "Senna",
		hints: [
			"Voix au-delà du voile.",
			"Prisonnière d'une âme errante.",
			"Fusil aux âmes captives.",
			"Purifie par la lumière.",
			"Revenante de l'ombre.",
		],
	},
	{
		answer: "Seraphine",
		hints: [
			"Voix douce dans l'ombre.",
			"Rêves portés par la musique.",
			"Scène en lévitation mystique.",
			"Écho d'harmonies protectrices.",
			"Artiste de Piltover, rose vibrante.",
		],
	},
	{
		answer: "Sett",
		hints: [
			"Combat clandestin brutal.",
			"Force brute indomptable.",
			"Régale la foule d'arènes.",
			"Auréolé d'une crinière sauvage.",
			"Poings destructeurs, mais pas d'armes.",
		],
	},
	{
		answer: "Shaco",
		hints: [
			"Rire résonnant dans la nuit.",
			"Ombres dans un cirque macabre.",
			"Piège mortel en boîte.",
			"Dague rapide et tranchante.",
			"Clown démoniaque insaisissable.",
		],
	},
	{
		answer: "Shen",
		hints: [
			"Silence méditatif.",
			"Equilibre éternel.",
			"Ombre dans la brume.",
			"Lame spirituelle aiguisée.",
			"Téléportation protectrice.",
		],
	},
	{
		answer: "Shyvana",
		hints: [
			"Dragons et légendes anciennes.",
			"Feu sous l'apparence humaine.",
			"Fille adoptée par la royauté.",
			"Terrible forme draconique.",
			"Flammes et écailles en fusion.",
		],
	},
	{
		answer: "Singed",
		hints: [
			"Des expériences qui tournent mal.",
			"Une odeur étrange dans l'air.",
			"Flacons brisés sur le sol.",
			"Fuite toxique à l'arrière.",
			"Course folle en alchimie.",
		],
	},
	{
		answer: "Sion",
		hints: [
			"Colosse ressuscité, terreur des vivants.",
			"Carnage sans fin, pourpre de rage.",
			"Hache colossale, destructrice.",
			"Charge inarrêtable, avance inexorable.",
			"Reprend vie à sa mort.",
		],
	},
	{
		answer: "Sivir",
		hints: [
			"Patrimoine antique oublié.",
			"Vent du désert soufflant.",
			"Chasseuse de trésors redoutée.",
			"Maîtresse de la ricoche.",
			"Arme boomerang tranchante.",
		],
	},
	{
		answer: "Skarner",
		hints: [
			"Cristaux vivants, âme captive.",
			"Créature du désert, oubliée.",
			"Gardien des anciens secrets.",
			"Frappe avec ses pinces.",
			"Ultime : enlèvement irrésistible.",
		],
	},
	{
		answer: "Smolder",
		hints: [
			"Infernos et incendies.",
			"Maître des flammes.",
			"Pyromane destructeur.",
			"Pluie de feu infernale.",
			"Bâton flamboyant en main.",
		],
	},
	{
		answer: "Sona",
		hints: [
			"Silence avant la tempête.",
			"Harmonies secrètes des runes.",
			"Muse aux cheveux bleus.",
			"Note pour soigner les alliés.",
			"Étincelle de crescendo musical.",
		],
	},
	{
		answer: "Soraka",
		hints: [
			"Gardienne des étoiles.",
			"Créature céleste et bienveillante.",
			"Mains qui guérissent les blessures.",
			"Interdite de violence personnelle.",
			"Soin d'une portée infinie.",
		],
	},
	{
		answer: "Swain",
		hints: [
			"Corbeau observateur, toujours à l'écoute.",
			"Pouvoir acquis par trahison.",
			"Maître des secrets de l'empire.",
			"Régent au cœur de Noxus.",
			"Transformation sombre et ailée.",
		],
	},
	{
		answer: "Sylas",
		hints: [
			"Geôlier et prisonnier à la fois.",
			"Chaînes comme signe de rébellion.",
			"Magie volée, pouvoir retourné.",
			"Révolte contre l'oppression magique.",
			"Ultime qui copie un ennemi.",
		],
	},
	{
		answer: "Syndra",
		hints: [
			"Ombres mystérieuses.",
			"Sphère d'énergie pure.",
			"Jeune prodige rebelle.",
			"Puissance brute incontrôlée.",
			"Orbes noirs à volonté.",
		],
	},
	{
		answer: "Tahm Kench",
		hints: [
			"Malice sous la surface.",
			"Gourmandise inassouvie.",
			"Maître des eaux sombres.",
			"Langue aussi longue qu'une route.",
			"Dévore ses alliés pour les sauver.",
		],
	},
	{
		answer: "Taliyah",
		hints: [
			"Jeux de tisseuse dans le désert.",
			"Torrent de sable sans fin.",
			"Fil de pierre en fluidité.",
			"Contrôle le terrain par vagues.",
			"Mur de pierre dévastateur.",
		],
	},
	{
		answer: "Talon",
		hints: [
			"Ombres aux intentions mortelles.",
			"Silhouette fugace et silencieuse.",
			"Maître des toits urbains.",
			"Assassin redouté de Noxus.",
			"Lames tranchantes et rapides.",
		],
	},
	{
		answer: "Taric",
		hints: [
			"Garde céleste oublié.",
			"Pierres sacrées vibrantes.",
			"Né sous le signe des étoiles.",
			"Bouclier de protection éclatante.",
			"Guerrier de la beauté divine.",
		],
	},
	{
		answer: "Teemo",
		hints: [
			"Petite silhouette dans la forêt.",
			"Sourire narquois et espiègle.",
			"Explorateur au grand chapeau.",
			"Maitrise des plantes toxiques.",
			"Champignons détonants sur le terrain.",
		],
	},
	{
		answer: "Thresh",
		hints: [
			"Spectre vengeur, âme en peine.",
			"Gardien de l'ombre, sans répit.",
			"Maître des chaînes spirituelles.",
			"Piège mortel, lanternes brillantes.",
			"Capture d'âmes, souffrance garantie.",
		],
	},
	{
		answer: "Tristana",
		hints: [
			"Poudre et feu.",
			"Explosions dans le brouillard.",
			"La canonneuse intrépide.",
			"Rebondit avec force.",
			"Canon massif sur l'épaule.",
		],
	},
	{
		answer: "Trundle",
		hints: [
			"Géant sous la glace.",
			"Roi d'une tribu glacée.",
			"Sceptre sculpté dans le givre.",
			"Voleur de force ennemie.",
			"Massue aussi lourde qu'efficace.",
		],
	},
	{
		answer: "Tryndamere",
		hints: [
			"Fureur incontrôlée d'un roi.",
			"Mélancolie d'un guerrier.",
			"Force brute et désespoir.",
			"Peut ignorer la mort.",
			"Épée immense à deux mains.",
		],
	},
	{
		answer: "Twisted Fate",
		hints: [
			"Cartes dans l'obscurité.",
			"Poker en bord de nuit.",
			"Chance et malice domptées.",
			"Cartes qui blessent ou soignent.",
			"Magicien aux cartes tranchantes.",
		],
	},
	{
		answer: "Twitch",
		hints: [
			"Flaire les opportunités.",
			"Ronge les profondeurs obscures.",
			"Alchimiste à l'écran.",
			"Tirs multiples et empoisonnés.",
			"Rat de Zaun.",
		],
	},
	{
		answer: "Udyr",
		hints: [
			"Esprit errant, montagnes sacrées.",
			"Chaman des terres sauvages.",
			"Garde-la-porte de Freljord.",
			"Maîtrise les formes animales.",
			"Change de posture pour combattre.",
		],
	},
	{
		answer: "Urgot",
		hints: [
			"Souvenirs de douleur éternelle.",
			"Métal et chair entremêlés.",
			"Marionnettiste de la peur.",
			"Tire des chaînes mortelles.",
			"Abattoir vivant à six pattes.",
		],
	},
	{
		answer: "Varus",
		hints: [
			"Vengeance d'âmes perdues.",
			"Flèche sombre et maudite.",
			"Deux esprits dans un.",
			"Arc qui perce tout.",
			"Carquois aux traits impitoyables.",
		],
	},
	{
		answer: "Vayne",
		hints: [
			"Chasseur de l'ombre.",
			"Terreur nocturne en embuscade.",
			"Croix d'argent fatale.",
			"Épieux bien aiguisés.",
			"Roues acrobatiques et flèches.",
		],
	},
	{
		answer: "Veigar",
		hints: [
			"Magie interdite et sombre désir.",
			"Petite taille, grandes ambitions.",
			"Chapeau pointu et menaçant.",
			"Maître des forces occultes.",
			"Prison de ténèbres, dévastation absolue.",
		],
	},
	{
		answer: "Vel'Koz",
		hints: [
			"Éclat venu d'ailleurs.",
			"Cerveau calculateur.",
			"Monstre œil unique.",
			"Dévorateur de connaissances.",
			"Rayon destructeur d'énergie pure.",
		],
	},
	{
		answer: "Vex",
		hints: [
			"Ombre qui murmure.",
			"Reflets d'une tristesse infinie.",
			"Petite silhouette capuchonnée.",
			"Compagne sombre et flottante.",
			"Maîtresse des malheurs.",
		],
	},
	{
		answer: "Vi",
		hints: [
			"Poings serrés, regard déterminé.",
			"Passé trouble, avenir incertain.",
			"Bras améliorés, force dévastatrice.",
			"Piltover, ordre et chaos.",
			"Gants hextech titanesques.",
		],
	},
	{
		answer: "Viego",
		hints: [
			"Amour tragique, royaume déchu.",
			"Obsession immortelle, cœur piégé.",
			"Écho spectral, marionnettiste d'âmes.",
			"Conquérant des morts, porteur de Ruine.",
			"Épée spectrale, abîme intérieur.",
		],
	},
	{
		answer: "Viktor",
		hints: [
			"Inventeur déchu, quête infinie.",
			"Mécanique et chair en symbiose.",
			"Inventions au cœur de Zaun.",
			"Rayons mortels et hextech.",
			"Augmentations pour l'humanité parfaite.",
		],
	},
	{
		answer: "Vladimir",
		hints: [
			"Élégance sombre et mystérieuse.",
			"Maître d'une ancienne magie.",
			"Charisme d'un noble déchu.",
			"Contrôle vital, survie raffinée.",
			"Baigné dans un bain de sang.",
		],
	},
	{
		answer: "Warwick",
		hints: [
			"L'odeur du sang le guide.",
			"Créature mi-homme, mi-bête.",
			"Ancien criminel transformé.",
			"Hurlements résonnent dans Zaun.",
			"Loup-garou assoiffé de sang.",
		],
	},
	{
		answer: "Wukong",
		hints: [
			"Esprit farceur et rusé.",
			"Maître des illusions.",
			"Bâton long et puissant.",
			"Maîtrise de l'art martial.",
			"Imitation simiesque parfaite.",
		],
	},
	{
		answer: "Xayah",
		hints: [
			"Plumes éparpillées.",
			"Danseuses en embuscade.",
			"Maître des lames au plumage.",
			"Tire des plumes fatales.",
			"Avec Rakan, inséparable duo.",
		],
	},
	{
		answer: "Xerath",
		hints: [
			"Énergies antiques, pouvoir incontrôlé.",
			"Esprit piégé, soif insatiable.",
			"Tir à longue distance.",
			"Puissance magique explosive.",
			"Destructeur arcanique surpuissant.",
		],
	},
	{
		answer: "Xin Zhao",
		hints: [
			"Héritage de guerre ancienne.",
			"Guerrier discipliné, âme noble.",
			"Maître du combat armé.",
			"Charge, déroute l'ennemi.",
			"Lance à trois pointes.",
		],
	},
	{
		answer: "Yasuo",
		hints: [
			"Ombre fendue d'un souffle.",
			"Errance entre vents et remords.",
			"Maître tranchant du zéphyr.",
			"Murin invisible protecteur.",
			"Lame et vent, indissociables.",
		],
	},
	{
		answer: "Yone",
		hints: [
			"Esprit tourmenté, âme divisée.",
			"Souffle de mort Japon féodal.",
			"Frère honni, était chasseur.",
			"Masque spectral, double visage.",
			"Ëpée et katana surnaturels.",
		],
	},
	{
		answer: "Yorick",
		hints: [
			"Ombres persistantes.",
			"Porteur de malédiction.",
			"Maître des fossoyeurs.",
			"Minions macabres à ses côtés.",
			"Pelle en main.",
		],
	},
	{
		answer: "Yuumi",
		hints: [
			"Livre ancien au savoir caché.",
			"Magie féline, muse silencieuse.",
			"Compagne scintillante et fidèle.",
			"Soins et protections en vol.",
			"Chat volant sur livre magique.",
		],
	},
	{
		answer: "Zac",
		hints: [
			"Création d'alchimistes.",
			"Flasque informe, à l'état brut.",
			"Géant vert bondissant.",
			"Se multiplie en combattant.",
			"Gelée extensible, pleine de rebondissements.",
		],
	},
	{
		answer: "Zed",
		hints: [
			"Ombres mouvantes et mortelles.",
			"Assassin silencieux et précis.",
			"Maître de l'illusion et du chaos.",
			"Lames en pluie létale.",
			"Techniques ninja ultimes.",
		],
	},
	{
		answer: "Zeri",
		hints: [
			"Électricité volatile, chaos vibrant.",
			"Fuite constante, jamais immobile.",
			"Tir précis, électrisant.",
			"Éclair de vitesse fulgurant.",
			"Tireuse de Zaun.",
		],
	},
	{
		answer: "Ziggs",
		hints: [
			"Explosion et chaos joyeux.",
			"Petit génie excentrique.",
			"Maître des bombes rondes.",
			"Pluie de projectiles destructeurs.",
			"Grand sourire et lunettes rondes.",
		],
	},
	{
		answer: "Zilean",
		hints: [
			"Temps tourmenté, jamais linéaire.",
			"Sagesse sous une barbe immaculée.",
			"Maître de la montre.",
			"Retour dans le passé immédiat.",
			"Renaissance en pleine bataille.",
		],
	},
	{
		answer: "Zoe",
		hints: [
			"Étoiles et rêves confondus.",
			"Rires d'une autre époque.",
			"Piliers de lumière dans l'ombre.",
			"Téléportation imprévisible et rapide.",
			"Éclats d'un portail trouble.",
		],
	},
	{
		answer: "Zyra",
		hints: [
			"Incarnation végétale.",
			"Nature en furie.",
			"Reine des ronces.",
			"Contrôle de zone épineux.",
			"Invocations de plantes mortelles.",
		],
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
	protected readonly hintPenalty = 2;
	protected index = signal(0);
	protected submittedToMix = signal(false);
	protected hintCount = signal(2); // 2 indices affichés par défaut
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
		Math.max(0, this.basePoints - Math.max(0, this.hintCount() - 2) * this.hintPenalty),
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
		// Splash art (1215x717) plutot que le portrait loading (308x560) : bien
		// plus haute resolution, donc pas de pixelisation une fois affiche en grand.
		return championSplashUrl(name);
	}
	revealHint() {
		if (this.locked() || this.hintCount() >= 5) return;
		this.hintCount.update((v) => Math.min(5, v + 1));
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
		this.hintCount.set(2);
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
		this.hintCount.set(2);
		this.verdict.set(null);
		this.lastGain.set(0);
		this.answer = "";
		this.locked.set(false);
		this.startRoundTimer();
	}
}
