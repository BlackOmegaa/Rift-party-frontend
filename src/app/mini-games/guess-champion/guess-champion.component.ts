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
			"Guerrier Darkin possédé.",
			"Régénère en tuant.",
			"Grande épée rouge.",
			"Ressuscite temporairement.",
			"Le Démon des Darkin.",
		],
	},
	{
		answer: "Ahri",
		hints: [
			"Mage renarde spirituelle.",
			"Charme ses ennemis.",
			"Queue de renard.",
			"Projette des orbes magiques.",
			"Renard à neuf queues.",
		],
	},
	{
		answer: "Akali",
		hints: [
			"Assassin agile et furtive.",
			"Utilise la fumée pour se cacher.",
			"Tatouages lumineux sur le corps.",
			"Peut se déplacer rapidement.",
			"Ninja de Kinkou.",
		],
	},
	{
		answer: "Akshan",
		hints: [
			"Tireur redoutable et agile.",
			"Se balance avec un grappin.",
			"Cape verte distinctive.",
			"Ressuscite ses alliés.",
			"Vengeur de Shurima.",
		],
	},
	{
		answer: "Alistar",
		hints: [
			"Tank minotaure.",
			"Peut se soigner.",
			"Cornes imposantes.",
			"Repousse et projette en l'air.",
			"Minotaure de la Ligue.",
		],
	},
	{
		answer: "Amumu",
		hints: [
			"Tank mort-vivant.",
			"Pleure constamment.",
			"Petite momie bleue.",
			"Étreint plusieurs ennemis.",
			"Momie tristement célèbre.",
		],
	},
	{
		answer: "Anivia",
		hints: [
			"Mage oiseau mythique.",
			"Contrôle la glace.",
			"Ailes de cristal.",
			"Crée un mur de glace.",
			"Phénix glacé renaissant.",
		],
	},
	{
		answer: "Annie",
		hints: [
			"Mage enfantine.",
			"Invoque un ours enflammé.",
			"Petite fille aux cheveux roux.",
			"Déchaîne un ours géant.",
			"Pyromancienne avec un ours.",
		],
	},
	{
		answer: "Aphelios",
		hints: [
			"Tireur lunaire silencieux.",
			"Change d'arme constamment.",
			"Cheveux blancs et longs.",
			"Utilise cinq armes différentes.",
			"Guidé par sa sœur Alune.",
		],
	},
	{
		answer: "Ashe",
		hints: [
			"Tireuse de givre.",
			"Ralentit avec ses flèches.",
			"Arc de glace élégant.",
			"Flèche géante étourdissante.",
			"Reine des Freljord.",
		],
	},
	{
		answer: "Aurelion Sol",
		hints: [
			"Dragon cosmique.",
			"Crée des étoiles en orbite.",
			"Énorme dragon céleste.",
			"Souffle stellaire dévastateur.",
			"Maître des étoiles.",
		],
	},
	{
		answer: "Azir",
		hints: [
			"Mage empereur déchu.",
			"Invoque des soldats de sable.",
			"Couronne dorée imposante.",
			"Déplace ses soldats à distance.",
			"Empereur de Shurima.",
		],
	},
	{
		answer: "Bard",
		hints: [
			"Support céleste et mystique.",
			"Collecte des clochettes.",
			"Grande cape et masque.",
			"Crée des portails à travers les murs.",
			"Endort tout le monde avec son ulti.",
		],
	},
	{
		answer: "Bel'Veth",
		hints: [
			"Créature du Néant.",
			"Consomme des monstres.",
			"Ailes de papillon.",
			"Se transforme après une mise à mort.",
			"Impératrice du Néant.",
		],
	},
	{
		answer: "Blitzcrank",
		hints: [
			"Robot tank.",
			"Attrape à distance.",
			"Bras mécanique géant.",
			"Tire et ramène un ennemi.",
			"Golem de vapeur.",
		],
	},
	{
		answer: "Brand",
		hints: [
			"Mage élémentaire enflammé.",
			"Inflige des brûlures continues.",
			"Entièrement en feu.",
			"Déclenche des explosions en chaîne.",
			"Esprit de feu consumant tout.",
		],
	},
	{
		answer: "Braum",
		hints: [
			"Tank protecteur humain.",
			"Projette un bouclier magique.",
			"Moustache et tatouages.",
			"Bloque les projectiles frontaux.",
			"Bouclier immense en porte.",
		],
	},
	{
		answer: "Briar",
		hints: [
			"Assassin sanguinaire.",
			"Utilise sa propre santé.",
			"Chaînes et armure rouge.",
			"Devient incontrôlable temporairement.",
			"Faim insatiable de sang.",
		],
	},
	{
		answer: "Caitlyn",
		hints: [
			"Tireur d'élite humaine.",
			"Pose des pièges.",
			"Chapeau haut-de-forme.",
			"Tir longue portée puissant.",
			"Shérif de Piltover.",
		],
	},
	{
		answer: "Camille",
		hints: [
			"Combattante humanoïde mécanique.",
			"Utilise des crochets pour se déplacer.",
			"Jambes mécaniques aiguisées.",
			"Crée une zone hexagonale.",
			"Protectrice de la famille Ferros.",
		],
	},
	{
		answer: "Cassiopeia",
		hints: [
			"Mage créature du Néant.",
			"Empoisonne sur la durée.",
			"Corps de serpent.",
			"Pétrifie en cône devant elle.",
			"Femme à queue de serpent.",
		],
	},
	{
		answer: "Cho'Gath",
		hints: [
			"Créature du Néant.",
			"Grandit en mangeant.",
			"Énormes griffes et crocs.",
			"Crie pour étourdir.",
			"Monstre à taille variable.",
		],
	},
	{
		answer: "Corki",
		hints: [
			"Yordle pilote aérien.",
			"Attaques à distance explosives.",
			"Petit avion rouge et blanc.",
			"Lance des missiles en rafale.",
			"Pilote de l'escadron Bandle.",
		],
	},
	{
		answer: "Darius",
		hints: [
			"Combattant brutal et impitoyable.",
			"Inflige des saignements cumulables.",
			"Armure rouge et menaçante.",
			"Exécute avec une hache géante.",
			"Noxien à la hache imposante.",
		],
	},
	{
		answer: "Diana",
		hints: [
			"Assassin lunaire.",
			"Utilise la lumière lunaire.",
			"Armure argentée et capuche.",
			"Attire les ennemis vers elle.",
			"Aspect de la lune.",
		],
	},
	{
		answer: "Dr. Mundo",
		hints: [
			"Tank mutant fou.",
			"Ignore les contrôles de foule.",
			"Porte une blouse déchirée.",
			"Régénération massive de santé.",
			"Lance des hachoirs ensanglantés.",
		],
	},
	{
		answer: "Draven",
		hints: [
			"Tireur vaniteux.",
			"Récupère des haches.",
			"Manteau de fourrure.",
			"Haches en ricochet.",
			"Le Glorieux Exécuteur.",
		],
	},
	{
		answer: "Ekko",
		hints: [
			"Assassin manipulateur du temps.",
			"Revient dans le passé.",
			"Cheveux blancs en pointe.",
			"Remonte le temps pour soigner.",
			"Jeune prodige de Zaun.",
		],
	},
	{
		answer: "Elise",
		hints: [
			"Mage arachnéenne.",
			"Se transforme en araignée.",
			"Six longues pattes visibles.",
			"Invoque des araignées.",
			"Reine des araignées.",
		],
	},
	{
		answer: "Evelynn",
		hints: [
			"Assassin démoniaque.",
			"Devient invisible en se déplaçant.",
			"Lames en forme de griffes.",
			"Charme ses ennemis avant d'attaquer.",
			"Succube séductrice.",
		],
	},
	{
		answer: "Ezreal",
		hints: [
			"Tireur explorateur.",
			"Tire des projectiles magiques.",
			"Gant lumineux et doré.",
			"Téléportation à courte distance.",
			"Aventurier blond et téméraire.",
		],
	},
	{
		answer: "Fiddlesticks",
		hints: [
			"Démon épouvantail.",
			"Effraie les ennemis.",
			"Corps en paille et bois.",
			"Attaque en zone terrifiante.",
			"Faux et corbeaux.",
		],
	},
	{
		answer: "Fiora",
		hints: [
			"Duelliste humaine experte.",
			"Riposte les attaques ennemies.",
			"Épée fine et élégante.",
			"Détecte les points faibles.",
			"Maîtresse de l'escrime.",
		],
	},
	{
		answer: "Fizz",
		hints: [
			"Assassin aquatique.",
			"Bondit sur les ennemis.",
			"Trident bleu luminescent.",
			"Invoque un requin géant.",
			"Créature des mers.",
		],
	},
	{
		answer: "Galio",
		hints: [
			"Tank gargantuesque.",
			"Absorbe la magie.",
			"Statue ailée imposante.",
			"Bondit sur ses alliés.",
			"Gargouille protectrice.",
		],
	},
	{
		answer: "Gangplank",
		hints: [
			"Pirate redoutable.",
			"Utilise des barils explosifs.",
			"Chapeau tricorne et pistolet.",
			"Bombarde une zone entière.",
			"Aime les oranges.",
		],
	},
	{
		answer: "Garen",
		hints: [
			"Guerrier humain résistant.",
			"Tournoie avec son épée.",
			"Armure lourde et cape.",
			"Silence sur les ennemis.",
			"Démacien, justice incarnée.",
		],
	},
	{
		answer: "Gnar",
		hints: [
			"Yordle préhistorique.",
			"Se transforme en géant.",
			"Petite créature orange.",
			"Lance des rochers massifs.",
			"Mini et méga formes.",
		],
	},
	{
		answer: "Gragas",
		hints: [
			"Tank maître brasseur.",
			"Roule en boule.",
			"Grosse bedaine.",
			"Lance un tonneau explosif.",
			"Toujours avec un tonneau.",
		],
	},
	{
		answer: "Graves",
		hints: [
			"Tireur hors-la-loi.",
			"Utilise des cartouches.",
			"Fumée aveuglante.",
			"Repousse avec son fusil.",
			"Chasse avec Twisted Fate.",
		],
	},
	{
		answer: "Gwen",
		hints: [
			"Mage poupée enchantée.",
			"Attaque avec des ciseaux.",
			"Cheveux bleus et bouclés.",
			"Inflige des dégâts en zone.",
			"Poupée vivante aux ciseaux.",
		],
	},
	{
		answer: "Hecarim",
		hints: [
			"Cavalier spectral.",
			"Charge à grande vitesse.",
			"Armure et sabots imposants.",
			"Effraie les ennemis en charge.",
			"Centaure fantomatique.",
		],
	},
	{
		answer: "Heimerdinger",
		hints: [
			"Yordle inventeur génial.",
			"Pose des tourelles.",
			"Lunettes et moustache blanche.",
			"Améliore ses inventions.",
			"Scientifique de génie.",
		],
	},
	{
		answer: "Hwei",
		hints: [
			"Ce champion n'existe pas.",
			"Vérifiez l'orthographe.",
			"Pas dans la base de données.",
			"Inconnu dans League of Legends.",
			"Erreur de saisie possible.",
		],
	},
	{
		answer: "Illaoi",
		hints: [
			"Prêtresse colossale.",
			"Invoque des tentacules.",
			"Tatouages dorés brillants.",
			"Arrache l'esprit des ennemis.",
			"Dévotion à Nagakabouros.",
		],
	},
	{
		answer: "Irelia",
		hints: [
			"Guerrière ionienne agile.",
			"Danse avec des lames.",
			"Cheveux longs et bleus.",
			"Projette des lames en avant.",
			"Maîtresse des lames flottantes.",
		],
	},
	{
		answer: "Ivern",
		hints: [
			"Support esprit de la nature.",
			"Crée des buissons.",
			"Grand et maigre.",
			"Invoque une amie géante.",
			"Ami des créatures de la forêt.",
		],
	},
	{
		answer: "Janna",
		hints: [
			"Mage élémentaire.",
			"Contrôle le vent.",
			"Cheveux blancs flottants.",
			"Projette ennemis en l'air.",
			"Déesse du vent.",
		],
	},
	{
		answer: "Jarvan IV",
		hints: [
			"Tank royal et noble.",
			"Crée un terrain impassable.",
			"Armure dorée et cape.",
			"Enferme les ennemis dans une arène.",
			"Prince de Demacia.",
		],
	},
	{
		answer: "Jax",
		hints: [
			"Guerrier mystérieux.",
			"Ne peut être esquivé.",
			"Porte une lanterne.",
			"Bloque les attaques pendant un temps.",
			"Maître des armes avec un bâton.",
		],
	},
	{
		answer: "Jayce",
		hints: [
			"Tireur et combattant technologique.",
			"Change de forme et d'arme.",
			"Marteau et canon futuristes.",
			"Projette une onde de choc.",
			"Rival de Viktor.",
		],
	},
	{
		answer: "Jhin",
		hints: [
			"Tireur psychopathe.",
			"Recharge après quatre tirs.",
			"Masque blanc et doré.",
			"Ultime : tirs à longue portée.",
			"Artiste du meurtre.",
		],
	},
	{
		answer: "Jinx",
		hints: [
			"Tireuse déjantée.",
			"Utilise des explosifs.",
			"Cheveux bleus longs.",
			"Lance une roquette globale.",
			"Obsédée par le chaos.",
		],
	},
	{
		answer: "K'Sante",
		hints: [
			"Tank guerrier.",
			"Renvoie les dégâts subis.",
			"Bouclier et armure imposants.",
			"Projette les ennemis derrière lui.",
			"Combattant de Nazumah.",
		],
	},
	{
		answer: "Kai'Sa",
		hints: [
			"Tireur du Néant.",
			"Accumule de l'énergie.",
			"Combinaison symbiotique.",
			"Plonge sur ses ennemis.",
			"Fille adoptive de Kassadin.",
		],
	},
	{
		answer: "Kalista",
		hints: [
			"Tireur spectral et vengeur.",
			"Saut après chaque attaque.",
			"Lance spectrale et armure noire.",
			"Lie un allié pour l'ulti.",
			"Esprit de la vengeance.",
		],
	},
	{
		answer: "Karma",
		hints: [
			"Mage spirituel.",
			"Manie des liens spirituels.",
			"Robe traditionnelle et élégante.",
			"Projette un cercle d'énergie.",
			"Guide éclairée d'Ionia.",
		],
	},
	{
		answer: "Karthus",
		hints: [
			"Mage mort-vivant.",
			"Chante pour infliger des dégâts.",
			"Squelette encapuchonné.",
			"Inflige des dégâts après la mort.",
			"Ultime global de dégâts.",
		],
	},
	{
		answer: "Kassadin",
		hints: [
			"Assassin du Néant.",
			"Ignore les collisions.",
			"Armure violette et noire.",
			"Se téléporte sur courte distance.",
			"Chasseur du Néant.",
		],
	},
	{
		answer: "Katarina",
		hints: [
			"Assassin agile et mortel.",
			"Lance des dagues circulaires.",
			"Cheveux rouges flamboyants.",
			"Tournoie avec des lames.",
			"Sœur de Cassiopeia.",
		],
	},
	{
		answer: "Kayle",
		hints: [
			"Guerrière céleste.",
			"Évolue avec le temps.",
			"Ailes de lumière dorée.",
			"Rend invincible un allié.",
			"Ange justicière.",
		],
	},
	{
		answer: "Kayn",
		hints: [
			"Assassin Darkin.",
			"Traverse les murs.",
			"Faux massive et rouge.",
			"Choisit entre Ombre ou Darkin.",
			"Fusionne avec Rhaast.",
		],
	},
	{
		answer: "Kennen",
		hints: [
			"Ninja yordle électrique.",
			"Projette des shurikens.",
			"Petite silhouette masquée.",
			"Crée une tempête électrique.",
			"Maître de la foudre.",
		],
	},
	{
		answer: "Kha'Zix",
		hints: [
			"Assassin créature du Néant.",
			"Évolue en gagnant des niveaux.",
			"Corps violet et chitineux.",
			"Peut devenir invisible temporairement.",
			"Chasse Rengar.",
		],
	},
	{
		answer: "Kindred",
		hints: [
			"Esprit de la mort.",
			"Marque ses ennemis.",
			"Masque blanc et bois.",
			"Zone empêchant de mourir.",
			"Loup et agneau.",
		],
	},
	{
		answer: "Kled",
		hints: [
			"Cavalier yordle agressif.",
			"Se bat avec sa monture.",
			"Casque à cornes distinctif.",
			"Charge en ligne droite.",
			"Monté sur Skaarl.",
		],
	},
	{
		answer: "Kog'Maw",
		hints: [
			"Créature du Néant.",
			"Crache du poison.",
			"Corps segmenté et coloré.",
			"Explose à sa mort.",
			"Cracheur de feu corrosif.",
		],
	},
	{
		answer: "LeBlanc",
		hints: [
			"Mage illusionniste.",
			"Se téléporte en arrière.",
			"Masque et cape élégante.",
			"Crée un double d'elle-même.",
			"Maîtresse des illusions.",
		],
	},
	{
		answer: "Lee Sin",
		hints: [
			"Moine combattant aveugle.",
			"Se déplace avec des sauts.",
			"Bandeau rouge sur les yeux.",
			"Inflige un coup de pied puissant.",
			"Maître des arts martiaux.",
		],
	},
	{
		answer: "Leona",
		hints: [
			"Tank solaire.",
			"Renforce ses alliés.",
			"Armure dorée et bouclier.",
			"Aveugle avec un rayon solaire.",
			"Paladin de l'aube.",
		],
	},
	{
		answer: "Lillia",
		hints: [
			"Esprit de la nature.",
			"Frappe en zone avec son bâton.",
			"Cornes et robe violette.",
			"Endort les ennemis proches.",
			"Faon rêveur.",
		],
	},
	{
		answer: "Lissandra",
		hints: [
			"Mage glacial et impitoyable.",
			"Gèle et immobilise ses ennemis.",
			"Couronne de glace imposante.",
			"Transforme ennemis en statues glacées.",
			"Sorcière de glace du Freljord.",
		],
	},
	{
		answer: "Lucian",
		hints: [
			"Tireur humain agile.",
			"Double tir rapide.",
			"Pistolets lumineux jumeaux.",
			"Tire une salve de lumière.",
			"Chasse les spectres.",
		],
	},
	{
		answer: "Lulu",
		hints: [
			"Soutien féerique.",
			"Transforme les ennemis.",
			"Chapeau pointu violet.",
			"Agrandit les alliés.",
			"Compagnon fée Pix.",
		],
	},
	{
		answer: "Lux",
		hints: [
			"Mage lumineux.",
			"Projette des rayons lumineux.",
			"Bâton avec orbe lumineux.",
			"Piège lumineux immobilisant.",
			"Ultime laser lumineux.",
		],
	},
	{
		answer: "Malphite",
		hints: [
			"Tank créature rocheuse.",
			"Augmente son armure.",
			"Corps massif de pierre.",
			"Charge en l'air et atterrit.",
			"Géant de pierre vivant.",
		],
	},
	{
		answer: "Malzahar",
		hints: [
			"Mage du Néant.",
			"Invoque des créatures.",
			"Voile violet et capuche.",
			"Immobilise avec une étreinte.",
			"Prophète du Néant.",
		],
	},
	{
		answer: "Maokai",
		hints: [
			"Tank arbre vivant.",
			"Utilise la magie de la nature.",
			"Branches et feuillage épais.",
			"Projette des racines immobilisantes.",
			"Entité de la forêt.",
		],
	},
	{
		answer: "Master Yi",
		hints: [
			"Épéiste Ionien rapide.",
			"Attaques en rafale.",
			"Armure dorée et violette.",
			"Devient invincible et rapide.",
			"Sept lames sur le casque.",
		],
	},
	{
		answer: "Milio",
		hints: [
			"Enchanteur enfantin.",
			"Contrôle le feu.",
			"Cheveux flamboyants.",
			"Sphère de soin enflammée.",
			"Jeune garçon avec des flammes.",
		],
	},
	{
		answer: "Miss Fortune",
		hints: [
			"Tireur humain redoutable.",
			"Tire des salves de balles.",
			"Chapeau et cheveux rouges.",
			"Pluie de balles en cône.",
			"Chasseuse de pirates.",
		],
	},
	{
		answer: "Mordekaiser",
		hints: [
			"Tank mort-vivant.",
			"Manipule les boucliers.",
			"Armure noire imposante.",
			"Emprisonne dans un royaume.",
			"Maître du métal et des morts.",
		],
	},
	{
		answer: "Morgana",
		hints: [
			"Mage déchu et tourmenté.",
			"Entrave les ennemis.",
			"Ailes sombres et imposantes.",
			"Crée un bouclier anti-magie.",
			"Sœur de Kayle.",
		],
	},
	{
		answer: "Naafiri",
		hints: [
			"Assassin des sables.",
			"Invoque des compagnons canins.",
			"Masque de chien.",
			"Bondit sur les ennemis.",
			"Meute de chiens du désert.",
		],
	},
	{
		answer: "Nami",
		hints: [
			"Soutien aquatique.",
			"Soigne et renverse.",
			"Queue de poisson.",
			"Vague géante déferlante.",
			"Siren des océans.",
		],
	},
	{
		answer: "Nasus",
		hints: [
			"Tank homme-chien.",
			"Accumule de la puissance.",
			"Grand bâton doré.",
			"Renforce ses attaques progressivement.",
			"Gardien de Shurima.",
		],
	},
	{
		answer: "Nautilus",
		hints: [
			"Tank géant des profondeurs.",
			"Lance une ancre.",
			"Scaphandre rouillé.",
			"Projette une onde de choc.",
			"Titan des mers.",
		],
	},
	{
		answer: "Neeko",
		hints: [
			"Mage métamorphe espiègle.",
			"Se transforme en alliés.",
			"Cheveux multicolores et queue.",
			"Stun en zone après saut.",
			"Caméléon vastaya.",
		],
	},
	{
		answer: "Nidalee",
		hints: [
			"Changeforme sauvage.",
			"Lance des javelots.",
			"Oreilles et queue félines.",
			"Se transforme en puma.",
			"Chasseuse de la jungle.",
		],
	},
	{
		answer: "Nilah",
		hints: [
			"Tireuse mystique.",
			"Absorbe les dégâts.",
			"Fouet liquide et lumineux.",
			"Partage la guérison.",
			"Joyeuse et optimiste.",
		],
	},
	{
		answer: "Nocturne",
		hints: [
			"Assassin cauchemardesque.",
			"Réduit la vision ennemie.",
			"Lames en forme de griffes.",
			"Plonge sur une cible isolée.",
			"Incarnation vivante des cauchemars.",
		],
	},
	{
		answer: "Nunu & Willump",
		hints: [
			"Tank et créature du Freljord.",
			"Crée un énorme projectile.",
			"Enfant sur un yéti.",
			"Aspire la chaleur environnante.",
			"Aventurier avec un yéti.",
		],
	},
	{
		answer: "Olaf",
		hints: [
			"Berserker nordique.",
			"Ignore les contrôles de foule.",
			"Grande hache de guerre.",
			"Augmente sa vitesse d'attaque.",
			"Rage incontrôlable.",
		],
	},
	{
		answer: "Orianna",
		hints: [
			"Mage automate.",
			"Contrôle une sphère.",
			"Robe mécanique élégante.",
			"Manipule la gravité autour.",
			"Fille automate avec une balle.",
		],
	},
	{
		answer: "Ornn",
		hints: [
			"Forgeron demi-dieu.",
			"Forge des objets en jeu.",
			"Grande barbe flamboyante.",
			"Invoque un bélier enflammé.",
			"Forge des objets pour alliés.",
		],
	},
	{
		answer: "Pantheon",
		hints: [
			"Guerrier demi-dieu.",
			"Lance des comètes.",
			"Casque à crête rouge.",
			"Atterrit en sautant du ciel.",
			"Aspect spartiate.",
		],
	},
	{
		answer: "Poppy",
		hints: [
			"Tank yordle courageuse.",
			"Lance un bouclier.",
			"Petite avec un marteau.",
			"Projette les ennemis loin.",
			"Gardienne du marteau légendaire.",
		],
	},
	{
		answer: "Pyke",
		hints: [
			"Assassin mort-vivant.",
			"Devient invisible brièvement.",
			"Crochet et poignard.",
			"Exécute avec un X rouge.",
			"Support tueur des profondeurs.",
		],
	},
	{
		answer: "Qiyana",
		hints: [
			"Assassin impériale.",
			"Contrôle les éléments.",
			"Couronne dorée et élégante.",
			"Crée un cercle élémentaire.",
			"Princesse de l'Empire d'Ixaocan.",
		],
	},
	{
		answer: "Quinn",
		hints: [
			"Tireuse et éclaireuse.",
			"Accompagnée d'un oiseau.",
			"Armure légère et cape.",
			"Plonge depuis les airs.",
			"Vallée et Valor.",
		],
	},
	{
		answer: "Rakan",
		hints: [
			"Support charismatique et agile.",
			"Charme les ennemis.",
			"Costume flamboyant et plumes.",
			"Bondit vers sa partenaire.",
			"Danseur et amant de Xayah.",
		],
	},
	{
		answer: "Rammus",
		hints: [
			"Tank armadillo.",
			"Rouler en boule.",
			"Carapace piquante.",
			"Renvoie les dégâts.",
			"C'est un tatou.",
		],
	},
	{
		answer: "Rek'Sai",
		hints: [
			"Créature du Néant.",
			"Se déplace sous terre.",
			"Peau bleue et épines.",
			"Bondit hors du sol.",
			"Reine des Xer'Sai.",
		],
	},
	{
		answer: "Rell",
		hints: [
			"Tank en armure lourde.",
			"Attire les ennemis vers elle.",
			"Chevalière en armure dorée.",
			"Crée un champ magnétique.",
			"Cavalière de métal.",
		],
	},
	{
		answer: "Renata Glasc",
		hints: [
			"Enchanteresse humaine.",
			"Utilise la chimie.",
			"Bras mécaniques élégants.",
			"Contrôle temporairement l'ennemi.",
			"Magnat de la chimie.",
		],
	},
	{
		answer: "Renekton",
		hints: [
			"Colosse reptilien.",
			"Devient furieux en combat.",
			"Armure d'écailles vertes.",
			"Bondit sur ses ennemis.",
			"Frère de Nasus.",
		],
	},
	{
		answer: "Rengar",
		hints: [
			"Assassin chasseur sauvage.",
			"Saut sur les ennemis.",
			"Crinière et fourrure blanches.",
			"Voit les ennemis isolés.",
			"Félin avec un œil en moins.",
		],
	},
	{
		answer: "Riven",
		hints: [
			"Guerrière humaine.",
			"Utilise la mobilité.",
			"Épée brisée et runique.",
			"Charge et repousse ses ennemis.",
			"Exilée de Noxus.",
		],
	},
	{
		answer: "Rumble",
		hints: [
			"Yordle ingénieur et inventeur.",
			"Utilise un mécha.",
			"Petit avec un robot.",
			"Lance une nappe de feu.",
			"Lance-flammes intégré.",
		],
	},
	{
		answer: "Ryze",
		hints: [
			"Mage ancien et puissant.",
			"Utilise des runes.",
			"Tatouages lumineux bleus.",
			"Téléporte une zone entière.",
			"Livre de sorts sur le dos.",
		],
	},
	{
		answer: "Samira",
		hints: [
			"Tireuse acrobatique.",
			"Combo d'attaques rapides.",
			"Cheveux blancs et rouges.",
			"Tire en cercle autour d'elle.",
			"Récompenses de style flamboyant.",
		],
	},
	{
		answer: "Sejuani",
		hints: [
			"Tank chevaucheur de bête.",
			"Gèle ses ennemis.",
			"Armure de glace épaisse.",
			"Charge avec son sanglier.",
			"Chevaucheur de Bristle.",
		],
	},
	{
		answer: "Senna",
		hints: [
			"Tireuse maudite.",
			"Attaque à distance.",
			"Long fusil d'âme.",
			"Bouclier et soin global.",
			"Libérée de la Lanterne.",
		],
	},
	{
		answer: "Seraphine",
		hints: [
			"Mage pop star.",
			"Amplifie les effets alliés.",
			"Cheveux roses et bleus.",
			"Charme en ligne droite.",
			"Chanteuse célèbre.",
		],
	},
	{
		answer: "Sett",
		hints: [
			"Combattant demi-vastaya.",
			"Absorbe les coups.",
			"Gros gants de boxe.",
			"Projette l'ennemi au sol.",
			"Patron des arènes clandestines.",
		],
	},
	{
		answer: "Shaco",
		hints: [
			"Assassin démoniaque.",
			"Pose des pièges explosifs.",
			"Masque de clown effrayant.",
			"Se dédouble pour attaquer.",
			"Rire sinistre et terrifiant.",
		],
	},
	{
		answer: "Shen",
		hints: [
			"Tank ninja spirituel.",
			"Projette une ombre protectrice.",
			"Armure bleue et masque.",
			"Téléportation pour protéger allié.",
			"Ninja avec une épée spirituelle.",
		],
	},
	{
		answer: "Shyvana",
		hints: [
			"Dragonne métamorphe.",
			"Accumule des fureurs.",
			"Écailles rouges flamboyantes.",
			"Se transforme en dragon.",
			"Mi-humaine, mi-dragon.",
		],
	},
	{
		answer: "Singed",
		hints: [
			"Tank alchimiste fou.",
			"Laisse une traînée toxique.",
			"Longue chevelure blanche.",
			"Projette ses ennemis derrière lui.",
			"Coureur fou de Zaun.",
		],
	},
	{
		answer: "Sion",
		hints: [
			"Tank mort-vivant colossal.",
			"Ressuscite temporairement.",
			"Immense hache rouge.",
			"Charge en ligne droite.",
			"Géant de Noxus.",
		],
	},
	{
		answer: "Sivir",
		hints: [
			"Tireuse mercenaire humaine.",
			"Projette un boomerang.",
			"Cheveux noirs et longs.",
			"Rebondit entre les ennemis.",
			"Reine de Shurima.",
		],
	},
	{
		answer: "Skarner",
		hints: [
			"Tank scorpion cristallin.",
			"Capture ses ennemis.",
			"Cristaux sur son dos.",
			"Immobilise avec sa queue.",
			"Scorpion du désert.",
		],
	},
	{
		answer: "Smolder",
		hints: [
			"Tank élémentaire de feu.",
			"Crée des zones brûlantes.",
			"Corps enflammé et massif.",
			"Inflige des dégâts sur la durée.",
			"Golem de lave.",
		],
	},
	{
		answer: "Sona",
		hints: [
			"Support mystique.",
			"Joue de la musique.",
			"Harpiste en robe bleue.",
			"Accorde des auras bénéfiques.",
			"Muette mais mélodieuse.",
		],
	},
	{
		answer: "Soraka",
		hints: [
			"Soutien céleste.",
			"Rend des points de vie.",
			"Cornes sur la tête.",
			"Soigne toute l'équipe.",
			"Étoile filante bienveillante.",
		],
	},
	{
		answer: "Swain",
		hints: [
			"Mage stratège et général.",
			"Se transforme temporairement.",
			"Main gauche démoniaque.",
			"Absorbe la vie des ennemis.",
			"Maître tacticien de Noxus.",
		],
	},
	{
		answer: "Sylas",
		hints: [
			"Mage rebelle et enchaîné.",
			"Vole les ultis ennemis.",
			"Chaînes lourdes et menaçantes.",
			"Libère une explosion magique.",
			"Le roi des voleurs de sorts.",
		],
	},
	{
		answer: "Syndra",
		hints: [
			"Mage de puissance brute.",
			"Peut manipuler des sphères.",
			"Robe sombre et élégante.",
			"Projette des sphères multiples.",
			"Maîtresse des sphères obscures.",
		],
	},
	{
		answer: "Tahm Kench",
		hints: [
			"Tank poisson-démon.",
			"Dévore les ennemis.",
			"Langue extensible.",
			"Protège avec un bouclier.",
			"Démon du fleuve.",
		],
	},
	{
		answer: "Taliyah",
		hints: [
			"Mage nomade.",
			"Surf sur la pierre.",
			"Vêtements de nomade.",
			"Crée un mur infranchissable.",
			"Manipule la terre.",
		],
	},
	{
		answer: "Talon",
		hints: [
			"Assassin humain agile.",
			"Saut par-dessus les murs.",
			"Cape rouge distinctive.",
			"Lames tournoyantes autour.",
			"Maître des ombres de Noxus.",
		],
	},
	{
		answer: "Taric",
		hints: [
			"Support céleste et protecteur.",
			"Renforce ses alliés.",
			"Armure étincelante.",
			"Rend ses alliés invulnérables.",
			"Gardien des étoiles.",
		],
	},
	{
		answer: "Teemo",
		hints: [
			"Yordle éclaireur espiègle.",
			"Devient invisible à l'arrêt.",
			"Petit, chapeau et sourire.",
			"Pose des champignons piégés.",
			"Fléchettes empoisonnées.",
		],
	},
	{
		answer: "Thresh",
		hints: [
			"Support mort-vivant.",
			"Capture les âmes.",
			"Lanterne verte brillante.",
			"Tire ses ennemis vers lui.",
			"Gardien des chaînes.",
		],
	},
	{
		answer: "Tristana",
		hints: [
			"Tireur yordle explosif.",
			"Saute sur ses ennemis.",
			"Canon gigantesque.",
			"Explose les ennemis proches.",
			"Tireuse à la roquette.",
		],
	},
	{
		answer: "Trundle",
		hints: [
			"Tank troll.",
			"Vol de statistiques.",
			"Massue imposante.",
			"Crée un pilier de glace.",
			"Roi des trolls.",
		],
	},
	{
		answer: "Tryndamere",
		hints: [
			"Guerrier barbare enragé.",
			"Augmente sa vitesse d'attaque.",
			"Épée massive et imposante.",
			"Insubmersible à la mort.",
			"Roi de Freljord.",
		],
	},
	{
		answer: "Twisted Fate",
		hints: [
			"Mage humain rusé.",
			"Pioche des cartes.",
			"Chapeau et manteau long.",
			"Téléportation à longue distance.",
			"Cartes magiques rouges et bleues.",
		],
	},
	{
		answer: "Twitch",
		hints: [
			"Assassin rat mutant.",
			"Attaque à distance empoisonnée.",
			"Longue queue et oreilles pointues.",
			"Tire en rafale rapide.",
			"Rat des égouts.",
		],
	},
	{
		answer: "Udyr",
		hints: [
			"Chaman changeforme.",
			"Adopte des postures animales.",
			"Tatouages lumineux sur le corps.",
			"Invocation de l'esprit du phénix.",
			"Maître des esprits animaux.",
		],
	},
	{
		answer: "Urgot",
		hints: [
			"Tireur cyborg massif.",
			"Peut se repositionner rapidement.",
			"Corps mécanique et imposant.",
			"Attire et exécute les ennemis.",
			"Six jambes mécaniques.",
		],
	},
	{
		answer: "Varus",
		hints: [
			"Tireur d'élite corrompu.",
			"Charge ses flèches.",
			"Arc sinistre et sombre.",
			"Tire une chaîne corruptrice.",
			"Possédé par un Darkin.",
		],
	},
	{
		answer: "Vayne",
		hints: [
			"Tireuse d'élite humaine.",
			"Se déplace en roulade.",
			"Arbalète à la main.",
			"Repousse les ennemis.",
			"Chasseuse de créatures nocturnes.",
		],
	},
	{
		answer: "Veigar",
		hints: [
			"Mage yordle maléfique.",
			"Accumule de la puissance infinie.",
			"Chapeau pointu et sombre.",
			"Emprisonne dans une cage magique.",
			"Maître du mal miniature.",
		],
	},
	{
		answer: "Vel'Koz",
		hints: [
			"Mage créature du Néant.",
			"Lance des rayons.",
			"Œil central flottant.",
			"Désintègre avec un laser.",
			"Étudie pour comprendre.",
		],
	},
	{
		answer: "Vex",
		hints: [
			"Mage yordle mélancolique.",
			"Contrôle les ombres.",
			"Capuche et yeux tristes.",
			"Projette une ombre géante.",
			"Déteste la joie.",
		],
	},
	{
		answer: "Vi",
		hints: [
			"Combattante humaine.",
			"Poings géants.",
			"Cheveux roses.",
			"Charge avec ses poings.",
			"Sœur de Jinx.",
		],
	},
	{
		answer: "Viego",
		hints: [
			"Assassin mort-vivant.",
			"Possède les ennemis vaincus.",
			"Couronne et cape noire.",
			"Réactive les compétences des ennemis.",
			"Roi déchu des Îles obscures.",
		],
	},
	{
		answer: "Viktor",
		hints: [
			"Mage humain amélioré.",
			"Crée des dispositifs mécaniques.",
			"Bras métallique imposant.",
			"Zone de gravité ralentissante.",
			"L'augmenteur de la technologie.",
		],
	},
	{
		answer: "Vladimir",
		hints: [
			"Mage immortel et sanguinaire.",
			"Utilise le sang pour soigner.",
			"Cape rouge flamboyante.",
			"Augmente la santé des alliés.",
			"Maître de l'hémomancie.",
		],
	},
	{
		answer: "Warwick",
		hints: [
			"Chasseur sanguinaire.",
			"Suit l'odeur du sang.",
			"Bras mécaniques imposants.",
			"Bondit sur les ennemis blessés.",
			"Loup-garou chimérique.",
		],
	},
	{
		answer: "Wukong",
		hints: [
			"Guerrier singe agile.",
			"Se dédouble en combat.",
			"Porte un bâton extensible.",
			"Tourbillonne pour frapper fort.",
			"Inspiré du Roi Singe.",
		],
	},
	{
		answer: "Xayah",
		hints: [
			"Tireur rebelle.",
			"Projette des plumes.",
			"Grandes ailes colorées.",
			"Rappelle ses plumes pour blesser.",
			"Vastaya avec Rakan.",
		],
	},
	{
		answer: "Xerath",
		hints: [
			"Mage antique et arcanique.",
			"Utilise l'énergie des arcanes.",
			"Forme éthérée et lumineuse.",
			"Tire des salves à longue portée.",
			"Être de pure énergie.",
		],
	},
	{
		answer: "Xin Zhao",
		hints: [
			"Guerrier humain.",
			"Lance des attaques rapides.",
			"Armure et lance.",
			"Charge vers l'ennemi.",
			"Garde du prince Jarvan.",
		],
	},
	{
		answer: "Yasuo",
		hints: [
			"Épéiste maudit et exilé.",
			"Manie le vent.",
			"Une seule longue épée.",
			"Bloque tous les projectiles.",
			"Le frère de Yone.",
		],
	},
	{
		answer: "Yone",
		hints: [
			"Épéiste ressuscité et tourmenté.",
			"Manie le vent et l'acier.",
			"Masque rouge et blanc.",
			"Attaque avec deux esprits.",
			"Le frère de Yasuo.",
		],
	},
	{
		answer: "Yorick",
		hints: [
			"Tank mort-vivant.",
			"Invoque des créatures.",
			"Pelle imposante.",
			"Contrôle une servante puissante.",
			"Maître des âmes et des tombes.",
		],
	},
	{
		answer: "Yuumi",
		hints: [
			"Support magique félin.",
			"Se lie à ses alliés.",
			"Petit chat avec un livre.",
			"Projette des vagues de soin.",
			"Chat volant avec un grimoire.",
		],
	},
	{
		answer: "Zac",
		hints: [
			"Tank créature du Néant.",
			"Se divise en morceaux.",
			"Corps vert gélatineux.",
			"Bondit sur les ennemis.",
			"Élastique et malléable.",
		],
	},
	{
		answer: "Zed",
		hints: [
			"Assassin ombreux et furtif.",
			"Se dédouble avec des ombres.",
			"Masque de ninja.",
			"Projette des ombres pour attaquer.",
			"Maître des ombres.",
		],
	},
	{
		answer: "Zeri",
		hints: [
			"Tireuse électrique.",
			"Glisse sur les murs.",
			"Cheveux verts et courts.",
			"Décharge d'énergie continue.",
			"Fusil à impulsion électrique.",
		],
	},
	{
		answer: "Ziggs",
		hints: [
			"Mage explosif yordle.",
			"Pose des mines explosives.",
			"Lunettes rondes et grandes.",
			"Lance une énorme bombe.",
			"Amoureux des explosions.",
		],
	},
	{
		answer: "Zilean",
		hints: [
			"Mage temporel ancien.",
			"Ralentit et accélère le temps.",
			"Grande barbe et sablier.",
			"Ressuscite un allié temporairement.",
			"Maître du temps.",
		],
	},
	{
		answer: "Zoe",
		hints: [
			"Mage espiègle.",
			"Vol de sorts temporaires.",
			"Cheveux multicolores flottants.",
			"Projette une bulle endormante.",
			"Aspect d'une jeune fille.",
		],
	},
	{
		answer: "Zyra",
		hints: [
			"Mage plante.",
			"Invoque des plantes.",
			"Cheveux rouges flamboyants.",
			"Contrôle la végétation.",
			"Sorcière des ronces.",
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
