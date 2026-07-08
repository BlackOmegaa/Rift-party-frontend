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
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Se soigne en frappant.",
			"Immense épée noire.",
			"Un Darkin redoutable.",
		],
	},
	{
		answer: "Ahri",
		hints: [
			"Mage à distance.",
			"Très mobile.",
			"Charme ses ennemis.",
			"Neuf queues.",
			"Renard légendaire.",
		],
	},
	{
		answer: "Akali",
		hints: [
			"Assassin furtif.",
			"Très mobile.",
			"Devient invisible dans un nuage.",
			"Utilise des kunaïs.",
			"Ninja de l'Ordre Kinkou.",
		],
	},
	{
		answer: "Akshan",
		hints: [
			"Tireur à distance.",
			"Très mobile.",
			"Se balance avec un grappin.",
			"Revient à la vie après mort.",
			"Sentinelle de la lumière.",
		],
	},
	{
		answer: "Alistar",
		hints: [
			"Support tank.",
			"Peut encaisser beaucoup de dégâts.",
			"Repousse et projette en l'air.",
			"Cornes imposantes.",
			"Taureau humanoïde.",
		],
	},
	{
		answer: "Amumu",
		hints: [
			"Tank au corps à corps.",
			"Inflige des dégâts de zone.",
			"Immobilise plusieurs ennemis.",
			"Enveloppé de bandages.",
			"Petite momie triste.",
		],
	},
	{
		answer: "Anivia",
		hints: [
			"Mage à distance.",
			"Contrôle le terrain.",
			"Crée des murs de glace.",
			"Peut se transformer en œuf.",
			"Phénix de glace.",
		],
	},
	{
		answer: "Annie",
		hints: [
			"Mage à distance.",
			"Inflige de lourds dégâts.",
			"Stun avec ses sorts.",
			"Accompagnée d'un ours en peluche.",
			"Petite fille aux cheveux roux.",
		],
	},
	{
		answer: "Aphelios",
		hints: [
			"Tireur à distance.",
			"Utilise plusieurs armes.",
			"Change d'arme en combat.",
			"Cinq armes différentes.",
			"Lunaire, lié à Alune.",
		],
	},
	{
		answer: "Ashe",
		hints: [
			"Tireur à distance.",
			"Inflige des ralentissements.",
			"Tire des flèches en rafale.",
			"Arc de givre.",
			"Reine de Freljord.",
		],
	},
	{
		answer: "Aurelion Sol",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts magiques.",
			"Contrôle les étoiles.",
			"Dragon céleste.",
			"Créateur de constellations.",
		],
	},
	{
		answer: "Azir",
		hints: [
			"Mage à distance.",
			"Invoque des unités.",
			"Peut se déplacer avec ses soldats.",
			"Manie des sables dorés.",
			"Empereur de Shurima.",
		],
	},
	{
		answer: "Bard",
		hints: [
			"Support à distance.",
			"Crée des portails.",
			"Collecte des clochettes.",
			"Apparence d'un gardien cosmique.",
			"Esprit vagabond des étoiles.",
		],
	},
	{
		answer: "Bel'Veth",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile et rapide.",
			"Dévore les ennemis morts.",
			"Ailes de papillon menaçantes.",
			"Impératrice du Néant.",
		],
	},
	{
		answer: "Blitzcrank",
		hints: [
			"Support tank.",
			"Capable de saisir à distance.",
			"Tire un grappin vers l'ennemi.",
			"Corps de robot géant.",
			"Golem de vapeur.",
		],
	},
	{
		answer: "Brand",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts sur la durée.",
			"Propage ses sorts en chaîne.",
			"Corps enflammé.",
			"Ancien pyromancien.",
		],
	},
	{
		answer: "Braum",
		hints: [
			"Support tank.",
			"Très résistant.",
			"Protège ses alliés.",
			"Porte un immense bouclier.",
			"Cœur de Freljord.",
		],
	},
	{
		answer: "Briar",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Se soigne en attaquant.",
			"Peau rougeâtre distinctive.",
			"Créature assoiffée de sang.",
		],
	},
	{
		answer: "Caitlyn",
		hints: [
			"Tireur à distance.",
			"Longue portée d'attaque.",
			"Pose des pièges au sol.",
			"Utilise un fusil de précision.",
			"Shérif de Piltover.",
		],
	},
	{
		answer: "Camille",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile.",
			"Se projette vers les murs.",
			"Jambes mécaniques tranchantes.",
			"Élite de la famille Ferros.",
		],
	},
	{
		answer: "Cassiopeia",
		hints: [
			"Mage à distance.",
			"Inflige du poison.",
			"Peut immobiliser avec son regard.",
			"Corps de serpent.",
			"Sœur de Katarina.",
		],
	},
	{
		answer: "Cho'Gath",
		hints: [
			"Tank au corps à corps.",
			"Inflige des dégâts de zone.",
			"Grandit en tuant.",
			"Immense créature du Néant.",
			"Monstre dévoreur.",
		],
	},
	{
		answer: "Corki",
		hints: [
			"Tireur à distance.",
			"Très mobile.",
			"Inflige des dégâts magiques.",
			"Pilote un avion.",
			"Yordle aviateur.",
		],
	},
	{
		answer: "Darius",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Inflige des saignements.",
			"Immense hache rouge.",
			"Noxien, frère de Draven.",
		],
	},
	{
		answer: "Diana",
		hints: [
			"Mage au corps à corps.",
			"Inflige des dégâts magiques.",
			"Se téléporte sur ses cibles.",
			"Utilise une lame en croissant.",
			"Aspect de la lune.",
		],
	},
	{
		answer: "Dr. Mundo",
		hints: [
			"Tank au corps à corps.",
			"Très résistant aux dégâts.",
			"Régénère sa santé rapidement.",
			"Lance des haches de boucher.",
			"Scientifique fou violet.",
		],
	},
	{
		answer: "Draven",
		hints: [
			"Tireur à distance.",
			"Excelle en duel.",
			"Rattrape ses haches.",
			"Charisme flamboyant.",
			"Frère de Darius.",
		],
	},
	{
		answer: "Ekko",
		hints: [
			"Assassin à distance.",
			"Très mobile.",
			"Manipule le temps.",
			"Utilise un sablier.",
			"Jeune prodige de Zaun.",
		],
	},
	{
		answer: "Elise",
		hints: [
			"Mage à distance.",
			"Inflige du poison.",
			"Se transforme en araignée.",
			"Contrôle des araignées.",
			"Reine araignée.",
		],
	},
	{
		answer: "Evelynn",
		hints: [
			"Assassin furtif.",
			"Très mobile.",
			"Charme ses ennemis.",
			"Démon séduisant.",
			"Femme fatale démoniaque.",
		],
	},
	{
		answer: "Ezreal",
		hints: [
			"Tireur à distance.",
			"Très mobile.",
			"Utilise des compétences à skillshot.",
			"Manie un gant magique.",
			"Explorateur prodigue.",
		],
	},
	{
		answer: "Fiddlesticks",
		hints: [
			"Mage à distance.",
			"Effraie ses ennemis.",
			"Canalise une attaque en zone.",
			"Semble fait d'épouvantail.",
			"Démon de la peur.",
		],
	},
	{
		answer: "Fiora",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Riposte les attaques ennemies.",
			"Maîtresse de l'escrime.",
			"Duelliste de Demacia.",
		],
	},
	{
		answer: "Fizz",
		hints: [
			"Assassin à distance.",
			"Très mobile et agile.",
			"Peut devenir intouchable.",
			"Invoque un requin.",
			"Petit poisson farceur.",
		],
	},
	{
		answer: "Galio",
		hints: [
			"Tank à distance.",
			"Résiste à la magie.",
			"Interrompt les sorts.",
			"Immense statue ailée.",
			"Gargouille protectrice de Demacia.",
		],
	},
	{
		answer: "Gangplank",
		hints: [
			"Combattant à distance.",
			"Utilise des barils explosifs.",
			"Soigne avec des oranges.",
			"Manie un pistolet et un sabre.",
			"Capitaine pirate redouté.",
		],
	},
	{
		answer: "Garen",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Tourne sur lui-même.",
			"Armure lourde et bouclier.",
			"Frère de Lux.",
		],
	},
	{
		answer: "Gnar",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile, saute partout.",
			"Se transforme en combat.",
			"Petite créature orange.",
			"Yordle préhistorique.",
		],
	},
	{
		answer: "Gragas",
		hints: [
			"Tank à distance.",
			"Excelle en contrôle de foule.",
			"Lance des barils explosifs.",
			"Aime la boisson.",
			"Baril et bedaine proéminents.",
		],
	},
	{
		answer: "Graves",
		hints: [
			"Tireur à distance.",
			"Excelle en duel rapproché.",
			"Fumée aveuglante.",
			"Fusil à double canon.",
			"Rival de Twisted Fate.",
		],
	},
	{
		answer: "Gwen",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile.",
			"Inflige des dégâts magiques.",
			"Utilise des ciseaux géants.",
			"Créée par Isolde.",
		],
	},
	{
		answer: "Hecarim",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile.",
			"Charge à grande vitesse.",
			"Apparence de centaure.",
			"Esprit de la guerre.",
		],
	},
	{
		answer: "Heimerdinger",
		hints: [
			"Mage à distance.",
			"Pose des tourelles.",
			"Contrôle la zone.",
			"Grandes lunettes rondes.",
			"Yordle inventeur génial.",
		],
	},
	{
		answer: "Hwei",
		hints: [
			"Mage à distance.",
			"Peint des toiles magiques.",
			"Invoque des esprits élémentaires.",
			"Combine feu, eau et terre.",
			"Peintre du Konkat, fils adoptif de Nagakabouros.",
		],
	},
	{
		answer: "Illaoi",
		hints: [
			"Combattant au corps à corps.",
			"Inflige des dégâts de zone.",
			"Invoque des tentacules.",
			"Porte un énorme totem.",
			"Prêtresse de Nagakabouros.",
		],
	},
	{
		answer: "Irelia",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile.",
			"Lames flottantes.",
			"Danseuse de combat.",
			"Maîtresse des lames de Ionia.",
		],
	},
	{
		answer: "Ivern",
		hints: [
			"Support à distance.",
			"Peut créer des buissons.",
			"Libère les monstres de la jungle.",
			"Arbre anthropomorphe.",
			"Ami de Daisy.",
		],
	},
	{
		answer: "Janna",
		hints: [
			"Mage à distance.",
			"Contrôle le vent.",
			"Projette les ennemis en l'air.",
			"Utilise un sceptre.",
			"Esprit du vent.",
		],
	},
	{
		answer: "Jarvan IV",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en initiation.",
			"Projette des drapeaux.",
			"Utilise une lance.",
			"Prince de Demacia.",
		],
	},
	{
		answer: "Jax",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Augmente sa vitesse d'attaque.",
			"Manie une lanterne et un bâton.",
			"Maître des armes sans égales.",
		],
	},
	{
		answer: "Jayce",
		hints: [
			"Tireur à distance.",
			"Change de forme.",
			"Utilise un marteau et un canon.",
			"Peut accélérer les alliés.",
			"Scientifique de Piltover.",
		],
	},
	{
		answer: "Jhin",
		hints: [
			"Tireur à distance.",
			"Inflige des dégâts critiques.",
			"Recharge après quatre tirs.",
			"Masque de théâtre.",
			"Artiste du crime.",
		],
	},
	{
		answer: "Jinx",
		hints: [
			"Tireur à distance.",
			"Très mobile en combat.",
			"Inflige des dégâts de zone.",
			"Utilise un lance-roquettes.",
			"Obsédée par le chaos.",
		],
	},
	{
		answer: "K'Sante",
		hints: [
			"Tank au corps à corps.",
			"Peut renverser ses ennemis.",
			"Utilise un bouclier.",
			"Armure dorée imposante.",
			"Guerrier de Nazumah.",
		],
	},
	{
		answer: "Kai'Sa",
		hints: [
			"Tireur à distance.",
			"Très mobile avec des dashs.",
			"Évolue en collectant des points.",
			"Tire des missiles en rafale.",
			"Fille adoptive de Kassadin.",
		],
	},
	{
		answer: "Kalista",
		hints: [
			"Tireur à distance.",
			"Excelle en duel.",
			"Se téléporte avec chaque attaque.",
			"Lance des javelots spectraux.",
			"Esprit de la vengeance.",
		],
	},
	{
		answer: "Karma",
		hints: [
			"Mage à distance.",
			"Support avec boucliers.",
			"Amplifie les compétences alliées.",
			"Manie un éventail lumineux.",
			"Guide spirituelle d'Ionia.",
		],
	},
	{
		answer: "Karthus",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts sur la durée.",
			"Peut se réanimer temporairement.",
			"Chante des lamentations funèbres.",
			"Mort-vivant avec une faux.",
		],
	},
	{
		answer: "Kassadin",
		hints: [
			"Mage à distance.",
			"Très mobile.",
			"Absorbe la magie.",
			"Épée à énergie.",
			"Chasseur du Néant.",
		],
	},
	{
		answer: "Katarina",
		hints: [
			"Assassin au corps à corps.",
			"Très mobile, grâce à ses dashs.",
			"Inflige des dégâts en zone.",
			"Manie des dagues.",
			"Fille du général Du Couteau.",
		],
	},
	{
		answer: "Kayle",
		hints: [
			"Combattant à distance.",
			"Se transforme avec le temps.",
			"Devient invincible temporairement.",
			"Ailes dorées flamboyantes.",
			"Sœur de Morgana.",
		],
	},
	{
		answer: "Kayn",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile, traverse les murs.",
			"Se transforme en deux formes.",
			"Manie une faux menaçante.",
			"Hôte d'un Darkin.",
		],
	},
	{
		answer: "Kennen",
		hints: [
			"Mage à distance.",
			"Très mobile.",
			"Projette des shurikens électriques.",
			"Transforme en tempête de foudre.",
			"Yordle ninja.",
		],
	},
	{
		answer: "Kha'Zix",
		hints: [
			"Assassin à distance.",
			"Très mobile, saute partout.",
			"Évolue en tuant.",
			"Peut devenir invisible.",
			"Créature du Néant.",
		],
	},
	{
		answer: "Kindred",
		hints: [
			"Tireur à distance.",
			"Très mobile.",
			"Marque les ennemis pour tuer.",
			"Duo de loup et agneau.",
			"Esprit de la mort.",
		],
	},
	{
		answer: "Kled",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Monte et descend de sa monture.",
			"Accompagné de son fidèle lézard.",
			"Yordle cavalier avec Skaarl.",
		],
	},
	{
		answer: "Kog'Maw",
		hints: [
			"Tireur à distance.",
			"Inflige des dégâts sur la durée.",
			"Tire des projectiles à longue portée.",
			"Crache de l'acide corrosif.",
			"Créature du Néant.",
		],
	},
	{
		answer: "LeBlanc",
		hints: [
			"Mage à distance.",
			"Très mobile.",
			"Crée des illusions.",
			"Manie une rose magique.",
			"Maîtresse des illusions.",
		],
	},
	{
		answer: "Lee Sin",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile, enchaîne les dashs.",
			"Peut révéler les ennemis invisibles.",
			"Moine aveugle.",
			"Maître des arts martiaux.",
		],
	},
	{
		answer: "Leona",
		hints: [
			"Support tank.",
			"Peut immobiliser plusieurs ennemis.",
			"Projette un rayon solaire.",
			"Armure dorée étincelante.",
			"Aspect solaire, guerrière de l'aube.",
		],
	},
	{
		answer: "Lillia",
		hints: [
			"Combattant à distance.",
			"Très mobile.",
			"Endort ses ennemis.",
			"Porte une branche magique.",
			"Faon rêveur.",
		],
	},
	{
		answer: "Lissandra",
		hints: [
			"Mage à distance.",
			"Contrôle de zone.",
			"Gèle ses ennemis.",
			"Couronne de glace.",
			"Reine des Glaces.",
		],
	},
	{
		answer: "Lucian",
		hints: [
			"Tireur à distance.",
			"Très mobile.",
			"Double tire à chaque attaque.",
			"Pistolets jumeaux.",
			"Chasseur de spectres.",
		],
	},
	{
		answer: "Lulu",
		hints: [
			"Support à distance.",
			"Apporte des améliorations.",
			"Polymorphisme ennemi.",
			"Compagnon fée violet.",
			"Yordle enchantée.",
		],
	},
	{
		answer: "Lux",
		hints: [
			"Mage à distance.",
			"Inflige de lourds dégâts magiques.",
			"Projette des barrières lumineuses.",
			"Utilise un bâton lumineux.",
			"Sœur de Garen.",
		],
	},
	{
		answer: "Malphite",
		hints: [
			"Tank au corps à corps.",
			"Très résistant.",
			"Peut ralentir les ennemis.",
			"Fait trembler le sol.",
			"Géant de pierre.",
		],
	},
	{
		answer: "Malzahar",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts sur la durée.",
			"Invoque des créatures.",
			"Portail vers le Néant.",
			"Prophète du Néant.",
		],
	},
	{
		answer: "Maokai",
		hints: [
			"Tank au corps à corps.",
			"Contrôle les foules.",
			"Invoque des pousses explosives.",
			"Arbre géant.",
			"Esprit de la nature.",
		],
	},
	{
		answer: "Master Yi",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile, rapide.",
			"Se soigne en frappant.",
			"Épée longue et fine.",
			"Maître du Wuju.",
		],
	},
	{
		answer: "Milio",
		hints: [
			"Support à distance.",
			"Utilise le feu.",
			"Soigne et protège.",
			"Lance des boules de feu.",
			"Enfant prodige de l'Ixtal.",
		],
	},
	{
		answer: "Miss Fortune",
		hints: [
			"Tireur à distance.",
			"Inflige des dégâts en zone.",
			"Tire en cône devant elle.",
			"Chapeau de pirate rouge.",
			"Chasseuse de primes célèbre.",
		],
	},
	{
		answer: "Mordekaiser",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Manipule les boucliers.",
			"Armure sombre imposante.",
			"Seigneur des morts-vivants.",
		],
	},
	{
		answer: "Morgana",
		hints: [
			"Mage à distance.",
			"Inflige des entraves.",
			"Bouclier anti-magie.",
			"Ailes sombres.",
			"Sœur de Kayle.",
		],
	},
	{
		answer: "Naafiri",
		hints: [
			"Assassin au corps à corps.",
			"Très mobile.",
			"Invoque des alliés canins.",
			"Crée des miroirs d'ombre.",
			"Meneuse des Darkin.",
		],
	},
	{
		answer: "Nami",
		hints: [
			"Support à distance.",
			"Peut soigner ses alliés.",
			"Projette des bulles.",
			"Contrôle l'eau.",
			"Sirène de l'océan.",
		],
	},
	{
		answer: "Nasus",
		hints: [
			"Combattant au corps à corps.",
			"Accumule de la puissance.",
			"Se renforce en tuant.",
			"Immense bâton doré.",
			"Frère de Renekton.",
		],
	},
	{
		answer: "Nautilus",
		hints: [
			"Support tank.",
			"Très résistant.",
			"Lance une ancre.",
			"Armure de plongée massive.",
			"Titan des profondeurs.",
		],
	},
	{
		answer: "Neeko",
		hints: [
			"Mage à distance.",
			"Change d'apparence.",
			"Projette un clone.",
			"Peau multicolore.",
			"Caméléon de la jungle.",
		],
	},
	{
		answer: "Nidalee",
		hints: [
			"Mage à distance.",
			"Très mobile.",
			"Se transforme en animal.",
			"Javelot puissant.",
			"Chasseuse changeant en puma.",
		],
	},
	{
		answer: "Nilah",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile et agile.",
			"Se renforce en tuant.",
			"Utilise un fouet liquide.",
			"Lutte contre les créatures du Néant.",
		],
	},
	{
		answer: "Nocturne",
		hints: [
			"Assassin à distance.",
			"Excelle dans les embuscades.",
			"Plonge sur ses cibles.",
			"Crée une obscurité totale.",
			"Cauchemar vivant.",
		],
	},
	{
		answer: "Nunu & Willump",
		hints: [
			"Tank à distance.",
			"Peut ralentir les ennemis.",
			"Lance une énorme boule de neige.",
			"Accompagné d'un yéti.",
			"Enfant et yéti inséparables.",
		],
	},
	{
		answer: "Olaf",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel prolongé.",
			"Se renforce en perdant de la vie.",
			"Porte deux haches.",
			"Viking déchaîné.",
		],
	},
	{
		answer: "Orianna",
		hints: [
			"Mage à distance.",
			"Contrôle de zone puissant.",
			"Utilise une sphère magique.",
			"Sphères flottantes autour d'elle.",
			"Automate avec une boule.",
		],
	},
	{
		answer: "Ornn",
		hints: [
			"Tank au corps à corps.",
			"Forge ses propres objets.",
			"Crée des murs de feu.",
			"Cornes imposantes.",
			"Demi-dieu forgeron.",
		],
	},
	{
		answer: "Pantheon",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Bloque les attaques avec un bouclier.",
			"Lance des javelots.",
			"Aspect de la guerre.",
		],
	},
	{
		answer: "Poppy",
		hints: [
			"Tank au corps à corps.",
			"Très résistante.",
			"Interrompt les dashs ennemis.",
			"Porte un immense marteau.",
			"Yordle protectrice de Demacia.",
		],
	},
	{
		answer: "Pyke",
		hints: [
			"Support assassin.",
			"Très mobile.",
			"Se soigne en tuant.",
			"Lance un harpon.",
			"Ancien harponneur ressuscité.",
		],
	},
	{
		answer: "Qiyana",
		hints: [
			"Assassin à distance.",
			"Très mobile.",
			"Utilise les éléments environnants.",
			"Couronne dorée distinctive.",
			"Impératrice des éléments.",
		],
	},
	{
		answer: "Quinn",
		hints: [
			"Tireur à distance.",
			"Très mobile avec son compagnon.",
			"Peut se repositionner rapidement.",
			"Accompagnée d'un aigle.",
			"Lieutenant de Demacia.",
		],
	},
	{
		answer: "Rakan",
		hints: [
			"Support à distance.",
			"Très mobile.",
			"Charme les ennemis.",
			"Plumes colorées.",
			"Amoureux de Xayah.",
		],
	},
	{
		answer: "Rammus",
		hints: [
			"Tank au corps à corps.",
			"Très résistant aux dégâts.",
			"Se déplace en roulant.",
			"Armure piquante.",
			"Créature blindée à carapace.",
		],
	},
	{
		answer: "Rek'Sai",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile sous terre.",
			"Creuse des tunnels.",
			"Cri terrifiant en surface.",
			"Créature du Néant.",
		],
	},
	{
		answer: "Rell",
		hints: [
			"Support tank.",
			"Contrôle de foule puissant.",
			"Attire les ennemis vers elle.",
			"Armure de métal vivant.",
			"Chevauche un destrier de fer.",
		],
	},
	{
		answer: "Renata Glasc",
		hints: [
			"Support à distance.",
			"Contrôle les foules.",
			"Ressuscite temporairement les alliés.",
			"Utilise des produits chimiques.",
			"Magnat de l'industrie chimique.",
		],
	},
	{
		answer: "Renekton",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Deviens enragé pour plus de puissance.",
			"Utilise une immense lame.",
			"Frère de Nasus.",
		],
	},
	{
		answer: "Rengar",
		hints: [
			"Assassin au corps à corps.",
			"Très mobile et rapide.",
			"Devient invisible brièvement.",
			"Collectionne des trophées.",
			"Chasseur vastaya avec un œil bandé.",
		],
	},
	{
		answer: "Riven",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile.",
			"Se renforce avec ses compétences.",
			"Épée brisée.",
			"Exilée de Noxus.",
		],
	},
	{
		answer: "Rumble",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts sur la durée.",
			"Utilise un lance-flammes.",
			"Pilote un mécha.",
			"Yordle à bord de Tristy.",
		],
	},
	{
		answer: "Ryze",
		hints: [
			"Mage à distance.",
			"Maîtrise des sorts multiples.",
			"Se téléporte sur la carte.",
			"Tatouages runiques sur le corps.",
			"Chercheur de runes puissantes.",
		],
	},
	{
		answer: "Samira",
		hints: [
			"Tireur à distance.",
			"Très mobile et agile.",
			"Enchaîne les attaques au corps à corps.",
			"Utilise des pistolets et épée.",
			"Tireuse acrobatique de Shurima.",
		],
	},
	{
		answer: "Sejuani",
		hints: [
			"Tank au corps à corps.",
			"Excelle en initiation.",
			"Gèle ses ennemis.",
			"Montée sur un sanglier.",
			"Chef des Freljord.",
		],
	},
	{
		answer: "Senna",
		hints: [
			"Support à distance.",
			"Inflige des dégâts magiques.",
			"Se soigne elle-même et ses alliés.",
			"Utilise une arme à feu massive.",
			"Femme de Lucian.",
		],
	},
	{
		answer: "Seraphine",
		hints: [
			"Mage à distance.",
			"Peut soigner ses alliés.",
			"Amplifie les effets de ses sorts.",
			"Utilise un micro.",
			"Chanteuse célèbre de Piltover.",
		],
	},
	{
		answer: "Sett",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Se soigne en frappant.",
			"Immense poing doré.",
			"Fils d'un chef de gang.",
		],
	},
	{
		answer: "Shaco",
		hints: [
			"Assassin furtif.",
			"Très mobile.",
			"Pose des pièges.",
			"Utilise des boîtes à surprises.",
			"Joker démoniaque.",
		],
	},
	{
		answer: "Shen",
		hints: [
			"Tank au corps à corps.",
			"Très mobile avec téléportation.",
			"Projette un bouclier protecteur.",
			"Manie une épée spirituelle.",
			"Ninja de l'équilibre.",
		],
	},
	{
		answer: "Shyvana",
		hints: [
			"Combattant au corps à corps.",
			"Se transforme temporairement.",
			"Inflige des dégâts de zone.",
			"Ailes de dragon.",
			"Mi-humaine, mi-dragon.",
		],
	},
	{
		answer: "Singed",
		hints: [
			"Combattant au corps à corps.",
			"Inflige du poison.",
			"Laisse une traînée toxique.",
			"Utilise un bouclier anti-sort.",
			"Scientifique fou.",
		],
	},
	{
		answer: "Sion",
		hints: [
			"Tank au corps à corps.",
			"Inflige des dégâts de zone.",
			"Revient à la vie temporairement.",
			"Immense hache rouge.",
			"Mort-vivant de Noxus.",
		],
	},
	{
		answer: "Sivir",
		hints: [
			"Tireur à distance.",
			"Excelle en nettoyage de vagues.",
			"Rebondit sur les ennemis.",
			"Manie un boomerang.",
			"Héritière de Shurima.",
		],
	},
	{
		answer: "Skarner",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en contrôle de zone.",
			"Peut immobiliser un ennemi.",
			"Cristaux sur son dos.",
			"Scorpion cristallin.",
		],
	},
	{
		answer: "Smolder",
		hints: [
			"Combattant au corps à corps.",
			"Inflige des brûlures.",
			"Se renforce en attaquant.",
			"Armes enflammées.",
			"Esprit du feu.",
		],
	},
	{
		answer: "Sona",
		hints: [
			"Support à distance.",
			"Utilise des auras bénéfiques.",
			"Soigne les alliés autour.",
			"Joue de la musique.",
			"Virtuose de la harpe.",
		],
	},
	{
		answer: "Soraka",
		hints: [
			"Support à distance.",
			"Soigne ses alliés.",
			"Restaure la santé à distance.",
			"Cornes lumineuses sur la tête.",
			"Créature céleste bienveillante.",
		],
	},
	{
		answer: "Swain",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts sur la durée.",
			"Peut attirer les ennemis.",
			"Se transforme en démon ailé.",
			"Général de Noxus.",
		],
	},
	{
		answer: "Sylas",
		hints: [
			"Mage au corps à corps.",
			"Très mobile.",
			"Vole les ultimes ennemis.",
			"Chaînes enroulées autour des bras.",
			"Révolutionnaire de Demacia.",
		],
	},
	{
		answer: "Syndra",
		hints: [
			"Mage à distance.",
			"Inflige de lourds dégâts.",
			"Manipule des sphères noires.",
			"Peut disperser les sphères.",
			"Souveraine de la noirceur.",
		],
	},
	{
		answer: "Tahm Kench",
		hints: [
			"Support tank.",
			"Peut avaler ses alliés.",
			"Crache des projectiles.",
			"Langue très longue.",
			"Démon du fleuve.",
		],
	},
	{
		answer: "Taliyah",
		hints: [
			"Mage à distance.",
			"Contrôle le terrain.",
			"Projette des pierres.",
			"Surf sur des murs.",
			"Maîtresse de la terre.",
		],
	},
	{
		answer: "Talon",
		hints: [
			"Assassin au corps à corps.",
			"Très mobile, franchit les murs.",
			"Inflige des saignements.",
			"Lames sur les avant-bras.",
			"Assassin de Noxus.",
		],
	},
	{
		answer: "Taric",
		hints: [
			"Support tank.",
			"Excelle en protection.",
			"Projette une aura de soin.",
			"Armure étincelante.",
			"Aspect de la Protection.",
		],
	},
	{
		answer: "Teemo",
		hints: [
			"Tireur à distance.",
			"Compte sur la ruse et le poison.",
			"Devient invisible à l'arrêt.",
			"Pose des champignons piégés.",
			"Petit yordle au chapeau.",
		],
	},
	{
		answer: "Thresh",
		hints: [
			"Support tank.",
			"Peut attraper ses ennemis.",
			"Récupère des âmes.",
			"Lanterne pour sauver alliés.",
			"Gardien des chaînes.",
		],
	},
	{
		answer: "Tristana",
		hints: [
			"Tireur à distance.",
			"Très mobile.",
			"Saute sur ses ennemis.",
			"Canon massif sur l'épaule.",
			"Yordle artilleuse.",
		],
	},
	{
		answer: "Trundle",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Vol de statistiques ennemies.",
			"Porte un immense bâton.",
			"Troll roi des trolls.",
		],
	},
	{
		answer: "Tryndamere",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Se soigne en frappant.",
			"Immense épée grande lame.",
			"Roi barbare.",
		],
	},
	{
		answer: "Twisted Fate",
		hints: [
			"Mage à distance.",
			"Excelle en contrôle de foule.",
			"Choisit ses cartes.",
			"Chapeau de magicien.",
			"Maître des cartes.",
		],
	},
	{
		answer: "Twitch",
		hints: [
			"Tireur à distance.",
			"Inflige du poison.",
			"Devient invisible temporairement.",
			"Utilise une arbalète.",
			"Rat mutant de Zaun.",
		],
	},
	{
		answer: "Udyr",
		hints: [
			"Combattant au corps à corps.",
			"Change de posture en combat.",
			"Accède à quatre formes animales.",
			"Tatouages tribaux.",
			"Esprit animal du Freljord.",
		],
	},
	{
		answer: "Urgot",
		hints: [
			"Combattant à distance.",
			"Utilise des chaînes.",
			"Peut exécuter les ennemis.",
			"A quatre jambes mécaniques.",
			"Ancien bourreau de Noxus.",
		],
	},
	{
		answer: "Varus",
		hints: [
			"Tireur à distance.",
			"Inflige des dégâts magiques.",
			"Tire des flèches perçantes.",
			"Arc corrompu par le Darkin.",
			"Possédé par un esprit vengeur.",
		],
	},
	{
		answer: "Vayne",
		hints: [
			"Tireur à distance.",
			"Très mobile en combat.",
			"Condamne ses ennemis au mur.",
			"Arbalète à carreaux d'argent.",
			"Chasseuse de monstres nocturnes.",
		],
	},
	{
		answer: "Veigar",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts magiques.",
			"Accumule de la puissance infinie.",
			"Chapeau pointu et grand bâton.",
			"Petit yordle maître des ténèbres.",
		],
	},
	{
		answer: "Vel'Koz",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts bruts.",
			"Analyse ses ennemis.",
			"Tentacules violets.",
			"Créature du Néant.",
		],
	},
	{
		answer: "Vex",
		hints: [
			"Mage à distance.",
			"Inflige de la peur.",
			"Projette une ombre.",
			"Porte une capuche noire.",
			"Yordle mélancolique.",
		],
	},
	{
		answer: "Vi",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile et agressive.",
			"Charge avec un coup de poing.",
			"Gants mécaniques géants.",
			"Ancienne membre de Piltover.",
		],
	},
	{
		answer: "Viego",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Possède ses ennemis vaincus.",
			"Épée spectrale.",
			"Roi déchu.",
		],
	},
	{
		answer: "Viktor",
		hints: [
			"Mage à distance.",
			"Contrôle des zones.",
			"Améliore ses compétences.",
			"Bras mécanique.",
			"Scientifique de Zaun.",
		],
	},
	{
		answer: "Vladimir",
		hints: [
			"Mage à distance.",
			"Régénère sa vie.",
			"Draine la vie des ennemis.",
			"Peut se transformer en flaque de sang.",
			"Vampire immortel.",
		],
	},
	{
		answer: "Warwick",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Se soigne en frappant.",
			"Griffes acérées et poilues.",
			"Créature mi-homme mi-loup.",
		],
	},
	{
		answer: "Wukong",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile.",
			"Crée des clones de lui-même.",
			"Manie un bâton extensible.",
			"Singe inspiré du Roi Singe.",
		],
	},
	{
		answer: "Xayah",
		hints: [
			"Tireur à distance.",
			"Inflige des dégâts en zone.",
			"Rappelle ses plumes pour attaquer.",
			"Ailes de plumes colorées.",
			"Partenaire de Rakan.",
		],
	},
	{
		answer: "Xerath",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts magiques.",
			"Capable de se transformer en tourelle.",
			"Lance des éclairs.",
			"Être d'énergie pure.",
		],
	},
	{
		answer: "Xin Zhao",
		hints: [
			"Combattant au corps à corps.",
			"Excelle en duel.",
			"Charge avec une lance.",
			"Armure de Demacia.",
			"Ancien garde du roi.",
		],
	},
	{
		answer: "Yasuo",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile, enchaîne les dashs.",
			"Manie le vent.",
			"Bloque tous les projectiles.",
			"Le frère de Yone.",
		],
	},
	{
		answer: "Yone",
		hints: [
			"Combattant au corps à corps.",
			"Très mobile, enchaîne les dashs.",
			"Manie deux épées.",
			"Masque rouge distinctif.",
			"Le frère de Yasuo.",
		],
	},
	{
		answer: "Yorick",
		hints: [
			"Combattant au corps à corps.",
			"Invoque des créatures.",
			"Manipule la mort.",
			"Porte une pelle massive.",
			"Gardien des Îles Obscures.",
		],
	},
	{
		answer: "Yuumi",
		hints: [
			"Support à distance.",
			"Très mobile, se déplace entre alliés.",
			"Se lie à un allié.",
			"Livre volant.",
			"Chat magique.",
		],
	},
	{
		answer: "Zac",
		hints: [
			"Tank au corps à corps.",
			"Très résistant et régénère.",
			"Se divise en morceaux.",
			"Corps gélatineux vert.",
			"Créature de matière vivante.",
		],
	},
	{
		answer: "Zed",
		hints: [
			"Assassin à distance.",
			"Très mobile, utilise les ombres.",
			"Projette des shurikens.",
			"Crée des clones d'ombre.",
			"Maître des ombres.",
		],
	},
	{
		answer: "Zeri",
		hints: [
			"Tireur à distance.",
			"Très mobile.",
			"Glisse sur les murs.",
			"Tire des rafales électriques.",
			"Maîtrise l'électricité.",
		],
	},
	{
		answer: "Ziggs",
		hints: [
			"Mage à distance.",
			"Inflige des dégâts de zone.",
			"Pose des mines explosives.",
			"Lance de grosses bombes.",
			"Yordle expert en explosifs.",
		],
	},
	{
		answer: "Zilean",
		hints: [
			"Mage à distance.",
			"Maîtrise le temps.",
			"Ressuscite les alliés.",
			"Vieil homme barbu.",
			"Gardien du temps.",
		],
	},
	{
		answer: "Zoe",
		hints: [
			"Mage à distance.",
			"Très mobile.",
			"Projette des bulles de sommeil.",
			"Utilise des portails pour se déplacer.",
			"Aspect d'une jeune fille espiègle.",
		],
	},
	{
		answer: "Zyra",
		hints: [
			"Mage à distance.",
			"Contrôle de zone puissant.",
			"Invoque des plantes.",
			"Manipule les ronces.",
			"Sorcière de la végétation.",
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
