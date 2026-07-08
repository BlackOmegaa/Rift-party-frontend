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
			"Guerrier Darkin, anciennement un Shurimien ayant été emprisonné.",
			"Utilise une grande épée comme arme principale.",
			"Peut se soigner en attaquant ses ennemis avec ses sorts.",
			"Possède une transformation qui augmente sa taille et ses forces.",
			"Connu comme le \"Massacre des Mondes\".",
		],
	},
	{
		answer: "Ahri",
		hints: [
			"Mage renard métamorphe à la recherche de son humanité.",
			"Peut charmer ses ennemis pour les attirer vers elle.",
			"Capable de se déplacer rapidement en lançant plusieurs projectiles.",
			"Elle absorbe les essences de ses ennemis pour se soigner.",
			"Renarde à neuf queues au charme surnaturel.",
		],
	},
	{
		answer: "Akali",
		hints: [
			"Assassin agile appartenant à un groupe d'élite mystérieux.",
			"Utilise des techniques de dissimulation pour surprendre ses ennemis.",
			"Capable de se repositionner rapidement en utilisant des attaques éclair.",
			"Projette une dague qui installe une zone sur le sol.",
			"Connue pour son double statut d'exilée et de ninja.",
		],
	},
	{
		answer: "Akshan",
		hints: [
			"Sentinelle intrépide cherchant à venger la mort de ses amis.",
			"Peut devenir invisible près des murs, ce qui améliore sa mobilité.",
			"Utilise un grappin pour se balancer à travers le terrain.",
			"Possède une arme à feu qui se recharge après chaque tir.",
			"Peut ressusciter ses alliés en éliminant ceux qui les ont tués.",
		],
	},
	{
		answer: "Alistar",
		hints: [
			"Support tank et imposant homme-bête à la force brute.",
			"Capable de stupéfier plusieurs ennemis avec son assaut frontal.",
			"Peut projeter un ennemi dans les airs, causant un grand chaos.",
			"Son rugissement libère des effets de contrôle et guérit des alliés proches.",
			"Un taureau humanoïde, souvent utilisé pour protéger ses alliés.",
		],
	},
	{
		answer: "Amumu",
		hints: [
			"Tank mélancolique, souvent associé à une malédiction persistante et solitaire.",
			"Se déplace lentement mais peut s'enrouler rapidement autour de ses ennemis.",
			"Dégâts de zone lorsque ses larmes empoisonnent les ennemis alentour.",
			"Peut enrouler un ennemi et l'attirer vers lui en s'étirant.",
			"Souvent considéré comme le champion le plus triste du jeu.",
		],
	},
	{
		answer: "Anivia",
		hints: [
			"Mage majestueux et protecteur, issu du domaine des esprits.",
			"Peut ralentir et geler ses ennemis avec ses compétences.",
			"Retransformée en œuf à sa mort, elle peut renaître si non détruite.",
			"Invoque une tempête glaciale qui inflige des dégâts de zone.",
			"Apparence de majestueux oiseau de glace avec de grandes ailes.",
		],
	},
	{
		answer: "Annie",
		hints: [
			"Jeune fille remplie de magie et possédée par un esprit de feu.",
			"Peut stocker du pouvoir pour étourdir un ennemi à chaque quatrième sort.",
			"Manie des sorts qui infligent des dégâts à distance avec du feu.",
			"Invoque un ours en peluche géant qui combat à ses côtés.",
			"Elle a toujours son adorable ourson Tibbers avec elle.",
		],
	},
	{
		answer: "Aphelios",
		hints: [
			"Tireur d'élite appartenant à une secte religieuse mystérieuse.",
			"Peut utiliser cinq armes différentes, chacune avec un mécanisme unique.",
			"Ne parle jamais, sa sœur communique à sa place pendant les combats.",
			"Son ultime utilise la forme principale de son arme pour infliger des dégâts en zone.",
			"Connu pour avoir une interface unique avec plusieurs icônes d'armes.",
		],
	},
	{
		answer: "Ashe",
		hints: [
			"Archère douée, elle est une reine au cœur glacé.",
			"Elle attaque ses ennemis en ralentissant leurs mouvements avec ses flèches.",
			"Ses projectiles peuvent augmenter de portée et se disperser en cône.",
			"Tire une flèche géante qui étourdit le premier ennemi touché.",
			"Connue comme l'archère au pouvoir du froid éternel.",
		],
	},
	{
		answer: "Aurelion Sol",
		hints: [
			"C'est un dragon stellaire avec une perspective cosmique unique.",
			"Peut influer sur le champ de bataille avec son souffle d'étoiles.",
			"Crée des étoiles qui orbitent autour de lui pour infliger des dégâts.",
			"Peut générer une explosion céleste qui étourdit en ligne droite.",
			"Connu pour sa taille énorme et ses liens avec l'univers cosmique.",
		],
	},
	{
		answer: "Azir",
		hints: [
			"Empereur ressuscité et ancien souverain d'un puissant empire.",
			"Peut invoquer des soldats qui attaquent à sa place.",
			"Possède une capacité de traînée où il se déplace vers ses soldats.",
			"Un de ses sorts lui permet de créer un mur de sable.",
			"Porte un sceptre doré et a une apparence aviaire imposante.",
		],
	},
	{
		answer: "Bard",
		hints: [
			"Support itinérant, il est lié à des créatures mystiques appelées Meeps.",
			"Collecte des carillons pour améliorer ses capacités tout au long du jeu.",
			"Peut créer des portails traversables à travers les murs.",
			"Capable de plonger une zone entière dans un profond sommeil.",
			"Un gardien cosmique, connu pour ses mélodies enchanteresses.",
		],
	},
	{
		answer: "Bel'Veth",
		hints: [
			"C'est une créature du Néant, une meneuse redoutable et vorace.",
			"Elle possède une forme simulant une mante religieuse.",
			"Elle a la capacité de se régénérer après avoir tué des ennemis.",
			"Peut entrer dans une phase frénétique après avoir vaincu un champion.",
			"Elle a l'apparence d'une grande créature avec des ailes massives.",
		],
	},
	{
		answer: "Blitzcrank",
		hints: [
			"C'est un robot doté d'une force surhumaine.",
			"Son gameplay repose sur l'attrait et le contrôle des ennemis.",
			"Il est célèbre pour son grand poing qui peut s'étendre.",
			"Peut attirer un ennemi vers lui avec son grappin mécanique.",
			"Connu pour ses prises spectaculaires qui renversent le cours d'une partie.",
		],
	},
	{
		answer: "Brand",
		hints: [
			"Membre d'une tribu avant d'être consumé par une puissance incendiaire.",
			"Mage à distance visant à infliger des dégâts continus à ses ennemis.",
			"Ses compétences gagnent en efficacité contre les ennemis enflammés.",
			"Peut lancer un sort qui rebondit entre les cibles, causant des explosions.",
			"Un être consumé par un feu éternel, jadis connu sous le nom de Kegan.",
		],
	},
	{
		answer: "Braum",
		hints: [
			"Gardien au grand cœur venant des terres glacées.",
			"Peut absorber de nombreux dégâts tout en protégeant ses alliés.",
			"Projette un projectile qui ralentit et applique un débuff.",
			"Déploie un grand bouclier pour intercepter les projectiles ennemis.",
			"Toujours accompagné de son précieux bouclier orné de métal.",
		],
	},
	{
		answer: "Briar",
		hints: [
			"Un vampire qui lutte pour contrôler sa soif de sang.",
			"Régénère sa santé en infligeant des dégâts aux ennemis.",
			"Sacrifie une partie de sa santé pour gagner en puissance temporaire.",
			"Peut entrer dans un état de frénésie, la rendant incontrôlable.",
			"Utilise un crâne géant comme arme au bout d'une chaîne.",
		],
	},
	{
		answer: "Caitlyn",
		hints: [
			"Elle est la shérif emblématique de son lieu d'origine.",
			"Utilise un piège qui immobilise temporairement les ennemis qui marchent dessus.",
			"Possède une longue portée qui dépasse celle des autres tireurs.",
			"Son attaque spéciale vise et tire un coup de fusil très précis, même à distance.",
			"Elle porte un chapeau haut de forme et utilise un fusil de précision.",
		],
	},
	{
		answer: "Camille",
		hints: [
			"Elle est une femme augmentée par la technologie, agissant comme un agent secret.",
			"Peut se déplacer rapidement sur le terrain avec un grappin.",
			"Utilise un bouclier adaptatif qui s'adapte en fonction de l'ennemi.",
			"Peut créer une zone impénétrable qui empêche les ennemis de fuir.",
			"Elle est connue pour ses jambes transformées en lames tranchantes.",
		],
	},
	{
		answer: "Cassiopeia",
		hints: [
			"Mage à distance devenue une créature mi-femme, mi-serpent.",
			"Inflige des dégâts continus en crachant du poison sur ses ennemis.",
			"Peut immobiliser ses adversaires en les pétrifiant s'ils la regardent.",
			"Ses sorts deviennent plus puissants contre des ennemis empoisonnés.",
			"Sœur de Katarina, transformée en gorgone après avoir trahi son clan.",
		],
	},
	{
		answer: "Cho'Gath",
		hints: [
			"Créature massive et terrifiante issue du Néant.",
			"Possède une capacité de régénération de santé exceptionnelle après avoir tué.",
			"Peut projeter une ligne de pointes depuis le sol pour infliger des dégâts.",
			"Possède un cri terrifiant qui réduit la résistance de ses ennemis.",
			"Grandit en dévorant ses victimes, augmentant sa taille et sa puissance.",
		],
	},
	{
		answer: "Corki",
		hints: [
			"C'est un yordle pilote d'avion qui aime les gadgets et les inventions.",
			"Se spécialise dans le combat à distance grâce à ses missiles.",
			"Peut activer un mode spécial pour un burst de dégâts temporaires.",
			"Peut tirer un gros missile qui inflige plus de dégâts que les petits.",
			"Volte avec son avion équipé d'une mitrailleuse et de roquettes explosives.",
		],
	},
	{
		answer: "Darius",
		hints: [
			"Guerrier brutal et impitoyable, souvent associé à un ordre militaire.",
			"Utilise une arme massive pour frapper en zone et appliquer saignement.",
			"Peut sérieusement affaiblir les ennemis avec un coup de hache en demi-cercle.",
			"Accumule saignements puis déclenche une attaque décisive qui achève l'ennemi.",
			"Connu comme la Main de Noxus, un bourreau redoutable sur le champ de bataille.",
		],
	},
	{
		answer: "Diana",
		hints: [
			"Assassin et combattante implacable, elle est liée à la Lune.",
			"Son apparence se distingue par une armure argentée et brillante.",
			"Peut se projeter rapidement vers un ennemi pour l'attaquer.",
			"Sa capacité iconique déclenche une pluie de lumière lunaire.",
			"Déesse de la Lune, avec une arme en forme de croissant.",
		],
	},
	{
		answer: "Dr. Mundo",
		hints: [
			"Tank et combattant, il a subi d'horribles expérimentations qui l'ont transformé.",
			"Il se régénère constamment, utilisant sa santé pour lancer ses sorts.",
			"Il porte une tenue de patient de couleur violette avec des menottes brisées.",
			"Peut lancer une tronçonneuse qui inflige des dégâts et ralentit sa cible.",
			"Il fait exactement ce qu’il veut, souvent de manière insensée.",
		],
	},
	{
		answer: "Draven",
		hints: [
			"Tireur d'élite à l'ego surdimensionné, motivé par la célébrité.",
			"Ses attaques automatiques reviennent vers lui comme des boomerangs.",
			"Peut gagner des bonus d'or en capturant des axes en série.",
			"Ses haches tourbillonnantes sont essentielles pour maximiser ses dégâts.",
			"Connu comme étant le frère de Darius au charisme indéniable.",
		],
	},
	{
		answer: "Ekko",
		hints: [
			"Inventeur prodige et manipulateur du temps venant des bas-fonds.",
			"Peut revenir en arrière dans le temps pour récupérer de la santé.",
			"Ses compétences laissent des échos après leur utilisation initiale.",
			"Possède un appareil qui projette une zone ralentissant les ennemis avant d'exploser.",
			"Sa devise : 'Rien de plus chouette qu'un retour dans le temps.'",
		],
	},
	{
		answer: "Elise",
		hints: [
			"Une mage spécialisée dans les transformations, liée à une ancienne religion.",
			"Possède deux formes distinctes, humaine et araignée, avec des compétences uniques.",
			"Peut invoquer de petites araignées pour l'assister au combat.",
			"Capable de se propulser rapidement vers un ennemi en forme araignée.",
			"Connue pour être la reine araignée des abîmes.",
		],
	},
	{
		answer: "Evelynn",
		hints: [
			"Assassin démoniaque qui charme ses proies avant de les tuer.",
			"Peut devenir invisible en se déplaçant près des autres champions.",
			"Ses attaques provoquent une explosion douloureuse après un court délai.",
			"Dispose d'un sort qui la régénère en frappant ses ennemis blessés.",
			"Ses câlins mortels sont redoutés par tous ceux qui la rencontrent.",
		],
	},
	{
		answer: "Ezreal",
		hints: [
			"Explorateur et aventurier, souvent à la recherche de trésors perdus.",
			"Peut se repositionner rapidement en utilisant un sort de téléportation courte.",
			"Ses compétences sont principalement des compétences à distance basées sur des projectiles.",
			"Dispose d'un sort à tir rapide qui inflige des dégâts en ligne droite.",
			"Connu pour sa réplique 'Tu ne pourras jamais toucher ce que tu ne peux pas attraper !'",
		],
	},
	{
		answer: "Fiddlesticks",
		hints: [
			"Créature épouvantail qui sème la terreur et se nourrit de peur.",
			"Capable d'immobiliser les ennemis grâce à une attaque terrifiante.",
			"Peut placer des leurres ressemblant à lui-même pour tromper les ennemis.",
			"Son ultime est un saut effrayant qui inflige d'importants dégâts de zone.",
			"Ressemble à un épouvantail terrifiant avec une faux grinçante.",
		],
	},
	{
		answer: "Fiora",
		hints: [
			"Duelliste talentueuse et noble, originaire d'une famille déshonorée.",
			"Capable de riposter automatiquement pour parer des compétences ennemies.",
			"Se spécialise dans l'identification et l'exploitation des faiblesses de ses ennemis.",
			"Peut marquer des points faibles spécifiques sur les champions adverses.",
			"Connu pour être un maître d'armes, utilisant une épée fine et rapide.",
		],
	},
	{
		answer: "Fizz",
		hints: [
			"Assassin aquatique, petite créature espiègle ressemblant à un poisson.",
			"Sa mobilité repose sur sa capacité à bondir sur un trident ou un sbire.",
			"Capable de devenir temporairement invincible en utilisant sa capacité de saut.",
			"Peut lancer un poisson qui attire un énorme prédateur marin sur sa cible.",
			"Manie un trident et porte un chapeau pointu orné de coquillages.",
		],
	},
	{
		answer: "Galio",
		hints: [
			"Colosse stoïque animé par la magie, protecteur des habitants.",
			"Est connu pour sa résistance massive et ses capacités protectrices en équipe.",
			"Peut déployer une zone qui ralentit et réduit les dégâts infligés.",
			"S'élance depuis une grande distance, s'écrasant au sol pour protéger ses alliés.",
			"Gargouille géante qui s'anime à la présence de magie.",
		],
	},
	{
		answer: "Gangplank",
		hints: [
			"C'est un homme pirate avide de pouvoir et de vengeance.",
			"Utilise des barils de poudre pour créer des explosions ciblées.",
			"Peut se soigner en consommant des oranges pendant le combat.",
			"Sa capacité ultime invoque un barrage de tirs de canon sur une large zone.",
			"Est obsédé par le contrôle et la terreur en haute mer.",
		],
	},
	{
		answer: "Garen",
		hints: [
			"Guerrier appartenant à un ordre devouée à sa patrie et la justice.",
			"Sa capacité passive lui permet de régénérer sa santé après un combat.",
			"Il tourne rapidement sur lui-même, infligeant des dégâts aux ennemis proches.",
			"Son pouvoir de jugement peut exécuter un ennemi avec une attaque finale puissante.",
			"Son cri de bataille est 'Demacia !', emblématique de son allégeance.",
		],
	},
	{
		answer: "Gnar",
		hints: [
			"Ancien yordle qui se transforme en une bête colossale lorsque contrarié.",
			"Peut lancer un boomerang qui revient après un certain temps.",
			"Sa transformation change complètement son style de jeu et ses capacités.",
			"Devient géant et gagne de nouvelles capacités après avoir accumulé de la fureur.",
			"Petit yordle orange qui se transforme en un énorme monstre bleu.",
		],
	},
	{
		answer: "Gragas",
		hints: [
			"Un colosse jovial et bourru qui aime les boissons alcoolisées.",
			"Il possède une grande barre de santé et excelle en tant que tank.",
			"Ses attaques incluent souvent une explosion ou une éclaboussure de boisson.",
			"Peut lancer un énorme tonneau qui explose en zone.",
			"C'est un champion qui affectionne tout particulièrement les boissons et la fête.",
		],
	},
	{
		answer: "Graves",
		hints: [
			"C'est un tireur et mercenaire connu pour son fort caractère.",
			"Il recharge son arme après chaque tir, limitant ses attaques successives.",
			"Ses attaques lancent de gros projectiles qui explosent en cône derrière l'ennemi.",
			"Possède une capacité qui génère de la fumée perturbant la vision des ennemis.",
			"Connu pour ses rivalités avec un certain voleur et joueur de cartes.",
		],
	},
	{
		answer: "Gwen",
		hints: [
			"Elle était autrefois une poupée animée par la magie.",
			"Utilise des attaques basées sur ses ciseaux géants pour infliger des dégâts.",
			"Peut créer une zone de protection qui annule les attaques à distance.",
			"Son ultime lui permet de lancer des aiguilles infligeant des dégâts multiples.",
			"Connue sous le surnom de \"La couturière sacrée\", née des Îles obscures.",
		],
	},
	{
		answer: "Hecarim",
		hints: [
			"Cavalier spectral au service d'un royaume d'outre-tombe.",
			"Peut traverser des terrains à grande vitesse, augmentant sa mobilité.",
			"Ses attaques deviennent plus puissantes à mesure qu'il avance.",
			"Charge en semant la terreur, dispersant les ennemis sur son passage.",
			"Un centaure spectre qui sème la mort lors de sa ruée.",
		],
	},
	{
		answer: "Heimerdinger",
		hints: [
			"Yordle brillant et inventeur de génie ayant une grande passion pour la science.",
			"Équipe le terrain avec de petites tourelles automatiques.",
			"Peut lancer des grenades qui étourdissent les ennemis touchés.",
			"Peut surcharger ses inventions pour améliorer leurs effets.",
			"Célèbre pour ses inventions, notamment ses appareils robotiques.",
		],
	},
	{
		answer: "Hwei",
		hints: [
			"Presque inconnu dans le lore, issu d'une petite communauté hors des grandes nations.",
			"Possède un tir rapide qui se recharge à intervalles réguliers.",
			"Peut tendre des câbles invisibles pour immobiliser les ennemis à distance.",
			"Détient une capacité à déclencher de l'énergie dans une large zone.",
			"Est souvent associé avec son acolyte, un renard à neuf queues.",
		],
	},
	{
		answer: "Illaoi",
		hints: [
			"Prêtresse d'un dieu ancien, elle incarne la foi et la force.",
			"Manie un énorme totem doré pour écraser ses ennemis.",
			"Invoque des tentacules qui attaquent automatiquement les ennemis proches.",
			"Arrache brièvement l'esprit des adversaires pour tester leur volonté.",
			"Connue comme le Kraken parmi les champions marins.",
		],
	},
	{
		answer: "Irelia",
		hints: [
			"Maîtresse de l'épée qui a perfectionné sa danse pour le combat.",
			"Ses lames flottantes peuvent être manipulées à distance avec grâce.",
			"Peut marquer les ennemis pour des attaques rapides et mortelles.",
			"Effectue une série de mouvements rapides en ligne droite.",
			"Connue pour sa maîtrise des lames télékinétiques et son élégance martiale.",
		],
	},
	{
		answer: "Ivern",
		hints: [
			"Il est un gardien de la nature et un ancien homme transformé.",
			"Peut traverser les murs quand il se déplace dans la jungle.",
			"Il ne tue pas les monstres de la jungle mais les libère.",
			"Aide ses alliés en invoquant un puissant arbre vivant pour se battre.",
			"Connu comme l'ami de tous les animaux et protecteur des forêts.",
		],
	},
	{
		answer: "Janna",
		hints: [
			"Mage élémentaire lié à l'air et à l'air frais.",
			"Utilise son bouclier pour renforcer les alliés temporairement.",
			"Peut invoquer des tempêtes ou des brises pour contrôler les foules.",
			"Sa capacité ultime soigne les alliés proches tout en repoussant les ennemis.",
			"Souvent appelée la \"Dame des Tempêtes\" avec un équipement orné de plumes.",
		],
	},
	{
		answer: "Jarvan IV",
		hints: [
			"Prince héritier humain, destiné à régner avec honneur et justice.",
			"Guerrier polyvalent, souvent joué dans la jungle ou à la toplane.",
			"Il peut créer un terrain bloquant pour piéger ses ennemis.",
			"Utilise sa lance pour se propulser vers le drapeau qu'il plante.",
			"Fils du roi d'une grande nation, symbolise la lignée royale.",
		],
	},
	{
		answer: "Jax",
		hints: [
			"Guerrier aguerri, il a survécu à une guerre cataclysmique.",
			"Possède un passif qui augmente ses dégâts avec chaque attaque consécutive.",
			"Rend tous les coups portés et reçus inoffensifs pendant quelques secondes.",
			"Sa signature est de brandir une lampe, qui n'est pas vraiment une arme.",
			"Connu pour être le Maître d'armes des champs de bataille.",
		],
	},
	{
		answer: "Jayce",
		hints: [
			"Scientifique brillant et charismatique, également un inventeur talentueux.",
			"Peut alterner entre deux formes avec des styles de combat différents.",
			"Utilise une arme polyvalente qui passe de marteau à canon.",
			"Son sort emblématique repousse les ennemis quand il est en mêlée.",
			"Connu pour ses capacités à changer son style de combat instantanément.",
		],
	},
	{
		answer: "Jhin",
		hints: [
			"Tireur d'élite obsédé par l'art et la beauté.",
			"Ses attaques de base sont uniques avec un nombre limité de balles.",
			"Sa vitesse de déplacement augmente considérablement après chaque coup critique.",
			"Peut tirer des projectiles à très longue distance qui immobilisent.",
			"Obsession pour le chiffre quatre, symbolisant perfection et finalité.",
		],
	},
	{
		answer: "Jinx",
		hints: [
			"Une criminelle perturbatrice à la personnalité chaotique.",
			"Capable de tirer des salves explosives et de lancer des grenades chasseresses.",
			"Transforme son lance-roquettes pour infliger de lourds dégâts de zone.",
			"Peut supercharger ses capacités, augmentant sa vitesse d'attaque et de déplacement.",
			"Obsession pour semer le chaos, souvent en duel avec un shérif justicier.",
		],
	},
	{
		answer: "K'Sante",
		hints: [
			"Guerrier résilient appartenant à une civilisation ancienne avec un style unique.",
			"Son gameplay repose sur un équilibre entre défense et attaque aggressive.",
			"Utilise un bouclier massif qui se transforme en deux armes.",
			"Peut charger contre un ennemi, l'expulsant sur une longue distance.",
			"Connu comme le Héraut de Nazumah, il protège avec fierté sa terre.",
		],
	},
	{
		answer: "Kai'Sa",
		hints: [
			"Tireur issu des profondeurs du Néant ayant survécu à son absorption.",
			"Possède une combinaison symbiotique qui évolue en fonction des statistiques.",
			"Peut déplacer sa position rapidement grâce à un court bond.",
			"Son arme principale tire une rafale de projectiles qui se disperse en cône.",
			"Connue pour son apparence mi-humaine, mi-créature du Néant.",
		],
	},
	{
		answer: "Kalista",
		hints: [
			"Revenante de la vengeance, elle est une championne avec une javelot terrible.",
			"Ses attaques de base permettent d'ajouter des marques pour un effet spécial.",
			"Peut se lier à un allié pour des interactions uniques et puissantes.",
			"Son ultime permet d'attirer un allié puis de le lancer vers l'avant.",
			"Elle est connue pour ses sauts après chaque attaque de base.",
		],
	},
	{
		answer: "Karma",
		hints: [
			"Enchanteresse avec un fort sens du devoir et de la spiritualité.",
			"Peut lier les ennemis avec ses pouvoirs pour les immobiliser temporairement.",
			"Capable de créer un bouclier qui protège et augmente la vitesse des alliés.",
			"Peut renforcer ses autres compétences pour des effets supplémentaires puissants.",
			"Mentor spirituelle connue pour sa réplique sur l'harmonie intérieure.",
		],
	},
	{
		answer: "Karthus",
		hints: [
			"Liche qui cherche à embrasser la mort pour mieux en faire son alliée.",
			"Capable de lâcher une série de projectiles sombres sur un ennemi.",
			"Pose une zone au sol qui ralentit et blesse ceux qui l'entravent.",
			"Une capacité ultime qui touche tout le monde, même à grande distance.",
			"Souvent vu chantant son requiem depuis l'au-delà.",
		],
	},
	{
		answer: "Kassadin",
		hints: [
			"Assassin mage qui a fusionné avec la technologie du Néant.",
			"Ses compétences consomment un type unique de ressource magique.",
			"Il peut se téléporter sur de courtes distances avec une compétence.",
			"Absorbe l'énergie magique pour réduire les dégâts qu'il subit.",
			"Connu pour son masque et sa voix déformée par le Néant.",
		],
	},
	{
		answer: "Katarina",
		hints: [
			"Assassin ayant des liens familiaux avec une force militaire importante.",
			"Utilise un système de réinitialisation quand elle tue ou assiste.",
			"Sa mobilité repose sur des projections rapides vers des dagues.",
			"Aime se téléporter sur ses lames lancées pour infliger des dégâts.",
			"Maîtresse des dagues tournoyantes qui infligent des dégâts en zone.",
		],
	},
	{
		answer: "Kayle",
		hints: [
			"Demi-déesse assoiffée de justice et sœur d'une déchue notoire.",
			"Se transforme au fil de la partie, gagnant en puissance sacrée.",
			"Connue pour invoquer des pluies d'épées de lumière.",
			"Peut accéder à un état transcendant, volant et gagnant des attaques puissantes.",
			"Ailes d'ange flamboyantes et armure dorée éclatante.",
		],
	},
	{
		answer: "Kayn",
		hints: [
			"Il est un Darkin, mais il partage son corps avec un humain.",
			"Il peut traverser les murs, ce qui lui donne une grande mobilité.",
			"Il a le choix entre deux formes distinctes influençant son style de jeu.",
			"Son arme change de forme et de couleur selon l'évolution choisie.",
			"Son passif lui permet de se transformer en Rhaast ou en Assassin de l'Ombre.",
		],
	},
	{
		answer: "Kennen",
		hints: [
			"Yordle, maître des tempêtes et membre d'un prestigieux ordre.",
			"Utilise sa vitesse pour attaquer et se déplacer rapidement.",
			"Projette des shurikens qui marquent les ennemis.",
			"Crée un champ d'énergie qui étourdit plusieurs adversaires autour de lui.",
			"Héros électrique souvent vu avec des éclairs autour de lui.",
		],
	},
	{
		answer: "Kha'Zix",
		hints: [
			"Assassin évolutif originaire du Néant, se renforce en chassant.",
			"Peut évoluer en gagnant des niveaux, modifiant ses capacités de base.",
			"Invisible pour un court moment en activant une capacité.",
			"Marque les ennemis isolés pour infliger des dégâts supplémentaires.",
			"Souvent en rivalité avec une créature du Néant appelée Rengar.",
		],
	},
	{
		answer: "Kindred",
		hints: [
			"Esprit mortel composé de deux entités distinctes, représentant la vie et la mort.",
			"Peut attaquer à distance tout en se déplaçant, souvent utilisé en jungle.",
			"Possède une mécanique de marque qui renforce ses capacités au fil du temps.",
			"Peut créer une zone où personne ne peut mourir, même à 1 point de vie.",
			"Composé d'un duo inséparable : l'agneau et le loup.",
		],
	},
	{
		answer: "Kled",
		hints: [
			"Cavalier furieux et impulsif monté sur un lézard géant.",
			"Peut se battre monté ou non, changeant ainsi ses compétences.",
			"Lorsqu'il charge, il devient très difficile de ralentir sa progression.",
			"Sa monture, Skaarl, est son fidèle compagnon et peut fuir en combat.",
			"Réplique emblématique : 'Ne jamais désobéir à un yordle monté en colère !'",
		],
	},
	{
		answer: "Kog'Maw",
		hints: [
			"Tireur venu du Néant, souvent accompagné d'un rôdeur dévastateur.",
			"Doté d'une attaque à distance qui augmente en portée progressivement.",
			"Utilise de la salive corrosive pour réduire les résistances ennemies.",
			"Crache des projectiles explosifs à longue portée à intervalles réguliers.",
			"Explose après sa mort, infligeant des dégâts en zone autour de lui.",
		],
	},
	{
		answer: "LeBlanc",
		hints: [
			"Magicienne habile et énigmatique, membre d'une organisation secrète influente.",
			"Spécialiste des illusions, elle crée des copies d'elle-même pour tromper ses ennemis.",
			"Dispose d'un ensemble de sorts avec un court délai de récupération.",
			"Peut se cloner pour maximiser ses dégâts ou échapper aux menaces.",
			"Connue pour sa capacité à étourdir avec une chaîne magique et faire des apparitions surprises.",
		],
	},
	{
		answer: "Lee Sin",
		hints: [
			"Moine et combattant aveugle maîtrisant le chi dans chaque attaque.",
			"Exécute un coup de pied rapide qui peut projeter un adversaire.",
			"Il est connu pour ses déplacements rapides avec un bond sur ses cibles.",
			"Peut révéler et marquer des ennemis cachés pour une attaque renforcée.",
			"Couramment associé au cri \"Dans ton visage !\" après un coup réussi.",
		],
	},
	{
		answer: "Leona",
		hints: [
			"Chevalier et gardienne, elle est dédiée à une lumière divine.",
			"Possède des compétences qui contrôlent le terrain et protègent les alliés.",
			"Utilise un bouclier et une épée dans ses combats lumineux.",
			"Provoque une éruption solaire qui étourdit les ennemis dans une zone.",
			"Est associée au pouvoir du soleil et porte une armure dorée.",
		],
	},
	{
		answer: "Lillia",
		hints: [
			"C'est une créature féerique hybride mi-humaine mi-cerf.",
			"Elle se déplace rapidement avec des capacités de zone, profitant de sa mobilité.",
			"Peut appliquer un effet de ralentissement et de dégâts sur la durée.",
			"Elle a une capacité pour endormir ses ennemis temporairement.",
			"Utilise une énorme fleur pour attaquer avec grâce.",
		],
	},
	{
		answer: "Lissandra",
		hints: [
			"Mage glaciale et impitoyable qui recherche le contrôle absolu.",
			"Capable de geler et immobiliser ses ennemis avec ses sorts.",
			"Ses compétences sont principalement basées sur la manipulation de la glace.",
			"Peut enfermer une cible dans un bloc de glace destructeur.",
			"Reine des Glaces avec une affinité pour les tempêtes glacées.",
		],
	},
	{
		answer: "Lucian",
		hints: [
			"Tireur d'élite, motivé par sa quête de vengeance.",
			"Peut tirer deux coups en succession rapide après l'utilisation d'une compétence.",
			"Son équipement comprend un duo de pistolets lumineux.",
			"Capable de se déplacer rapidement en effectuant une roulade.",
			"Cherche à libérer l'âme de sa femme, Senna.",
		],
	},
	{
		answer: "Lulu",
		hints: [
			"Elle appartient à la catégorie des yordles et adore les illusions.",
			"Peut agrandir temporairement un allié, lui offrant de la taille et des PV.",
			"Transforme ses ennemis en petites créatures inoffensives pendant quelques secondes.",
			"Lance une lance qui ralentit et inflige des dégâts magiques en ligne droite.",
			"Accompagnée d'un petit esprit féérique nommé Pix.",
		],
	},
	{
		answer: "Lux",
		hints: [
			"Mage lumineux affiliée à une famille influente.",
			"Capable de lancer des sorts à longue portée qui infligent des dégâts magiques.",
			"Ses compétences génèrent des éclats de lumière qui illuminent brièvement la zone.",
			"Peut emprisonner les ennemis dans une cage de lumière temporaire.",
			"Lance un puissant rayon lumineux qui traverse toute une ligne ennemie.",
		],
	},
	{
		answer: "Malphite",
		hints: [
			"C'est un immense colosse de pierre, formé de fragments de la Terre.",
			"Son style de jeu est celui d'un tank résistant et durable.",
			"Il possède une capacité passive qui lui offre un bouclier après un certain temps.",
			"Peut infliger des perturbations à plusieurs ennemis en les renversant dans les airs.",
			"Connue pour sa capacité à créer une entrée spectaculaire lors des combats d'équipe.",
		],
	},
	{
		answer: "Malzahar",
		hints: [
			"Il est un prophète humain lié au Néant.",
			"Il peut invoquer une créature du Néant pour attaquer les ennemis.",
			"Son style de jeu se base sur la propagation de dégâts sur la durée.",
			"Peut immobiliser et infliger d'importants dégâts à une cible unique.",
			"Portant perpétuellement un voile violet, il voit des visions du Néant.",
		],
	},
	{
		answer: "Maokai",
		hints: [
			"C'est un esprit de la nature en colère, autrefois paisible.",
			"Utilise des racines pour entraver ses ennemis à distance.",
			"Peut déployer de petits plants qui explosent au contact.",
			"Libère un souffle d'énergie qui repousse et blesse les ennemis en ligne droite.",
			"Ressemble à un grand arbre vivant, protecteur de la nature.",
		],
	},
	{
		answer: "Master Yi",
		hints: [
			"Combattant implacable cherchant la maîtrise ultime des arts martiaux.",
			"Ses attaques répétées augmentent sa vitesse d'attaque progressivement.",
			"Il peut se soigner en méditant et devenir temporairement résistant.",
			"Capable de cibler plusieurs ennemis à la vitesse de l'éclair pour les trancher.",
			"Son apparence est marquée par son casque distinctif à sept yeux.",
		],
	},
	{
		answer: "Milio",
		hints: [
			"Enfant prodige avec un lien spirituel, manipulateur du feu et protecteur.",
			"Joue principalement en soutien, se concentre sur les soins et boucliers.",
			"Peut lancer de petites créatures enflammées qui soignent les alliés.",
			"Déploie une grande onde de feu pour dissiper les contrôles de foule.",
			"Accompagné de Fidou, la tortue de feu dansante.",
		],
	},
	{
		answer: "Miss Fortune",
		hints: [
			"C'est une chasseuse de primes humaine, souvent en quête de vengeance.",
			"Ses attaques de base peuvent toucher plusieurs cibles en un coup.",
			"Possède une compétence qui ralentit les ennemis avec une pluie de projectiles.",
			"Déchaîne une salve en cône qui inflige d'importants dégâts de zone.",
			"Connue pour sa chevelure rousse flamboyante et son style de pirate.",
		],
	},
	{
		answer: "Mordekaiser",
		hints: [
			"C'est un colosse mort-vivant qui règne sur un royaume spectral.",
			"Ses attaques sont renforcées chaque troisième coup de suite.",
			"Il possède un bouclier qui se convertit en soin.",
			"Peut isoler un ennemi dans un royaume sombre, les affrontant en duel.",
			"Porte une armure massive et une grande masse comme arme.",
		],
	},
	{
		answer: "Morgana",
		hints: [
			"Mage et support à l'apparence d'un être déchu.",
			"Utilise des chaînes pour lier les ennemis et les immobiliser.",
			"Peut créer un bouclier magique protégeant contre les sorts ennemis.",
			"Ses attaques peuvent infliger des dégâts et immobiliser sur une zone.",
			"La sœur ange déchue, opposée à celle qui protège la lumière.",
		],
	},
	{
		answer: "Naafiri",
		hints: [
			"Assassin du désert abritant une meute de créatures dans son esprit.",
			"Se bat en appelant des entités à ses côtés pour l'aider.",
			"Apprécie les combats rapprochés avec ses crocs acérés.",
			"Peut traquer un ennemi en utilisant un sens olfactif redoutable.",
			"Un être proche des chiens, visant à chasser sans pitié.",
		],
	},
	{
		answer: "Nami",
		hints: [
			"Support aquatique, elle communique avec la faune marine.",
			"Peut projeter une bulle à distance qui immobilise les ennemis.",
			"Dispose d'une capacité de soins ciblés qui rebondit entre alliés et ennemis.",
			"Lance une énorme vague qui repousse les adversaires sur son passage.",
			"Sirène qui maîtrise les mers et chante pour aider ses alliés.",
		],
	},
	{
		answer: "Nasus",
		hints: [
			"Colosse immortel, gardien des sables et frère d'un rénégat.",
			"Accumule de la force supplémentaire en tuant des sbires avec son attaque siphonnée.",
			"Sa forme imposante évoque celle d'un ancien dieu chien.",
			"Peut se renforcer temporairement, devenant plus grand et puissant.",
			"Célèbre pour son bâton orné et son apparence de chien humanoïde.",
		],
	},
	{
		answer: "Nautilus",
		hints: [
			"Colosse en armure, fréquemment associé aux profondeurs marines.",
			"Sa présence impose une aura de lourdeur et de contrôle.",
			"Peut immobiliser les ennemis en leur lançant son ancre massive.",
			"Lance un projectile qui brise le sol et poursuit sa cible principale.",
			"Connu pour son rôle de protecteur des mers, souvent équipé d'un scaphandre.",
		],
	},
	{
		answer: "Neeko",
		hints: [
			"Elle est une caméléon, pouvant changer d'apparence à volonté.",
			"Elle peut se fondre dans l'équipe, imitant les alliés.",
			"Possède une attaque de zone qui immobilise les ennemis touchés.",
			"Une de ses capacités la transforme en sphère pourstupéfier les ennemis autour.",
			"Elle est souvent associée à des plantes et à la jungle.",
		],
	},
	{
		answer: "Nidalee",
		hints: [
			"Chasseresse changeforme vivant dans la jungle, alliant instincts félins et humains.",
			"Capable de se transformer en une créature sauvage, avec des compétences uniques.",
			"Utilise des javelots qui infligent des dégâts plus élevés à longue distance.",
			"Dispose de pièges visibles qui révèlent et blessent les ennemis qui les déclenchent.",
			"Connue pour sa transformation en puma, bondissant sur ses proies.",
		],
	},
	{
		answer: "Nilah",
		hints: [
			"C'est une guerrière qui a fait un pacte avec une entité aquatique.",
			"Elle se bat avec un fouet semblable à de l'eau.",
			"Son style de jeu incite à attaquer de très près pour maximiser l'impact.",
			"Elle partage l'expérience des sbires avec ceux proches d'elle sans en perdre.",
			"Éclate de joie après chaque victoire, fêtant les petites et grandes réussites.",
		],
	},
	{
		answer: "Nocturne",
		hints: [
			"C'est un assassin cauchemardesque issu des ténèbres.",
			"Son style de jeu repose sur la plongée rapide dans les combats.",
			"Se déplace rapidement vers une cible tout en infligeant des dégâts.",
			"Peut obscurcir la vision de l'équipe ennemie entière pendant quelques secondes.",
			"Apparaît comme une entité ombreuse avec des lames acérées sur les bras.",
		],
	},
	{
		answer: "Nunu & Willump",
		hints: [
			"Un duo formé d'un enfant intrépide et d'un yéti robuste.",
			"Capable de lancer des boules de neige géantes à grande vitesse.",
			"Peut manger des sbires pour régénérer des PV et du mana.",
			"Possède une capacité qui crée une tempête de glace autour de lui, ralentissant puis explosant.",
			"Le petit garçon et son fidèle yéti parcourent ensemble les montagnes enneigées.",
		],
	},
	{
		answer: "Olaf",
		hints: [
			"Un guerrier féroce, originaire des terres nordiques et nommé après un fruit.",
			"Utilise des haches qu'il peut lancer pour infliger des dégâts à distance.",
			"Son style de combat est axé sur l'attaque constante et la brutalité pure.",
			"Possède une capacité qui le rend temporairement insensible aux contrôles de foule.",
			"Sa rage augmente lorsqu'il est blessé, ce qui le rend plus dangereux.",
		],
	},
	{
		answer: "Orianna",
		hints: [
			"Mage entièrement mécanique ayant l'apparence d'une jeune fille.",
			"Ses compétences tournent autour d'une sphère flottante.",
			"Peut déplacer son orbe pour infliger des dégâts ou protéger.",
			"Cette sphère peut attirer les ennemis vers son centre d'un coup explosif.",
			"Toujours accompagnée par sa fidèle balle mécanique au combat.",
		],
	},
	{
		answer: "Ornn",
		hints: [
			"Demi-dieu forgeron aux talents inégalés, souvent solitaire et taciturne.",
			"Peut améliorer les objets de ses alliés en plein combat.",
			"Dispose d'une compétence qui émet une onde de choc en ligne droite.",
			"Invoque un bélier de feu qui charge vers lui pour le renvoyer.",
			"Est un forgeron barbu avec des cornes d'un rouge incandescent.",
		],
	},
	{
		answer: "Pantheon",
		hints: [
			"C'est un guerrier déterminé qui sert un aspect céleste.",
			"Utilise une lance et un bouclier pour maîtriser le champ de bataille.",
			"Peut bloquer une attaque avec son bouclier tout en avançant.",
			"Peut s'élever et frapper une large zone avec une chute spectaculaire.",
			"Porte un casque spartiate et une armure dorée brillante.",
		],
	},
	{
		answer: "Poppy",
		hints: [
			"Yordle ayant prêté serment de protéger un marteau sacré.",
			"Sa mobilité dépend d'une charge qui repousse les ennemis.",
			"Possède un bouclier qui tombe et peut être ramassé au sol.",
			"Capable de projeter ses ennemis très loin avec une frappe puissante.",
			"Petite avec une grande armure et un énorme marteau.",
		],
	},
	{
		answer: "Pyke",
		hints: [
			"Il est un spectre revenant hanté par la trahison et la vengeance.",
			"Peut devenir invisible et se déplacer rapidement dans un rayon.",
			"Convertit ses points de santé supplémentaires en dégâts d'attaque.",
			"Sa capacité signature exécute les ennemis avec peu de santé.",
			"Un support assassin qui surgit des ombres pour finir sa proie.",
		],
	},
	{
		answer: "Qiyana",
		hints: [
			"Assassin de l'élément, membre d'une famille royale ambitieuse.",
			"Utilise un boomerang circulaire pour attaquer ses ennemis.",
			"Peut enchanter ses lames avec des éléments du terrain.",
			"Crée une onde de choc explosive en frappant un élément.",
			"Maitrise trois éléments : pierre, glace et eau.",
		],
	},
	{
		answer: "Quinn",
		hints: [
			"Tireuse d'élite accompagnée de son fidèle compagnon ailé.",
			"Peut observer les ennemis cachés grâce à son éclaireur volant.",
			"Possède une attaque passive qui marque les ennemis pour augmenter les dégâts.",
			"Son ultime lui permet de fusionner avec son oiseau pour gagner en mobilité.",
			"Elle et Valor, son aigle, forment un duo inséparable sur le champ de bataille.",
		],
	},
	{
		answer: "Rakan",
		hints: [
			"Mage support charismatique et séducteur connu pour sa grâce naturelle.",
			"Il peut soigner ses alliés avec une compétence en zone.",
			"Peut se précipiter vers ses alliés pour une entrée en scène flamboyante.",
			"Associe son charme avec un effet de séduction en combat rapproché.",
			"Il forme un duo inséparable avec Xayah, sa partenaire et amante.",
		],
	},
	{
		answer: "Rammus",
		hints: [
			"Créature résistante et silencieuse, mi-reptile, mi-mammifère.",
			"Roule en boule pour se déplacer rapidement sur le champ de bataille.",
			"Possède une carapace qui renvoie les dégâts subis aux attaquants.",
			"Peut provoquer des tremblements de terre autour de lui pour infliger des dégâts.",
			"Souvent dit : \"D'accord.\" avec une voix profonde et monotone.",
		],
	},
	{
		answer: "Rek'Sai",
		hints: [
			"C'est une créature du Néant qui rôde sous terre.",
			"Elle peut creuser des tunnels pour se déplacer rapidement.",
			"Capable de détecter les ennemis par leurs vibrations au sol.",
			"Son cri terrifiant révèle la présence de ses proies aux alentours.",
			"Ressemble à un énorme ver avec des mâchoires acérées.",
		],
	},
	{
		answer: "Rell",
		hints: [
			"Chevalière forgée de métal vivant, liée intimement à son destrier.",
			"Peut attirer les ennemis vers elle avec ses chaînes de fer.",
			"Son style de jeu repose sur l'initiation et le contrôle de foule.",
			"Capacité à provoquer une explosion qui désarme temporairement l'ennemi.",
			"Monte un destrier de fer qu'elle peut démonter pour changer de forme.",
		],
	},
	{
		answer: "Renata Glasc",
		hints: [
			"Femme influente et impitoyable, elle est une alchimiste talentueuse.",
			"Créée des produits chimiques pour manipuler ses alliés et ennemis.",
			"Sa mécanique repose sur le contrôle de l'ennemi et soutien d'équipe.",
			"Peut obliger un ennemi à attaquer ses propres alliés temporairement.",
			"Célèbre pour être une riche magnat de produits chimiques.",
		],
	},
	{
		answer: "Renekton",
		hints: [
			"C'est un champion colérique, autrefois un guerrier honorable devenu fou.",
			"Il gagne de la puissance en furie, accumulée en combattant ses adversaires.",
			"Il est un combattant robuste qui excelle en mêlée solitaire.",
			"Peut pousser et étourdir un ennemi contre un mur ou un obstacle.",
			"Son apparence est celle d'un immense crocodile bipède et armé.",
		],
	},
	{
		answer: "Rengar",
		hints: [
			"Chasseur prédateur, membre d'une espèce humanoïde ressemblant à un lion.",
			"Peut poser des pièges invisibles qui révèlent et ralentissent les ennemis.",
			"Sa mécanique tourne autour de l'accumulation de férocité pour des compétences améliorées.",
			"Devient invisible et localise un ennemi comme ultime capacité.",
			"Connu pour traquer et chasser impitoyablement Kha'Zix.",
		],
	},
	{
		answer: "Riven",
		hints: [
			"Guerrière solitaire cherchant la rédemption après avoir brisé son sabre runique.",
			"Maîtrise un style de combat sans égal grâce à son épée brisée.",
			"Peut enchaîner des mouvements rapides et fluides grâce à ses coups de sabre.",
			"Peut projeter une onde de choc dévastatrice avec son arme reconstituée.",
			"Ancienne soldat, elle porte une épée qui a été brisée.",
		],
	},
	{
		answer: "Rumble",
		hints: [
			"Un yordle inventeur avec un penchant pour la technologie artisanale.",
			"Il combat avec un méca qu'il a construit lui-même.",
			"Peut surchauffer son méca, augmentant temporairement sa puissance d'attaque.",
			"Projette une traînée de flammes sur le sol, infligeant des dégâts continus.",
			"Aime se venger de ceux qui sous-estiment l'ingéniosité yordle.",
		],
	},
	{
		answer: "Ryze",
		hints: [
			"Membre d'une ancienne race humaine liée à la magie.",
			"Peut empiler des sorts pour déclencher des effets supplémentaires.",
			"Son sort de zone rebondit entre les ennemis et alliés affectés.",
			"Capable de se téléporter avec ses alliés à travers la carte.",
			"Il porte un lourd parchemin et la puissance des arcanes est en lui.",
		],
	},
	{
		answer: "Samira",
		hints: [
			"C'est une tireuse à mi-chemin entre mercenaire et artiste martiale.",
			"Elle accumule du style grâce à la variété de ses attaques.",
			"Elle peut effectuer une roulade qui améliore sa prochaine attaque.",
			"Projette ses adversaires dans les airs avec une attaque au corps à corps.",
			"Utilise une combinaison de pistolets et de sabres pour ses attaques.",
		],
	},
	{
		answer: "Sejuani",
		hints: [
			"C'est une combattante résistante et intrépide chevauchant une monture.",
			"Son style de jeu repose sur le contrôle des foules et la robustesse.",
			"Manie une lance impressionnante recouverte de givre lors des combats.",
			"Peut geler les ennemis après les avoir étourdis avec sa monture.",
			"Chevauche une gigantesque créature similaire à un sanglier nommé Bristle.",
		],
	},
	{
		answer: "Senna",
		hints: [
			"Support et tireur spectral, liée aux Îles Obscures par sa malédiction.",
			"Utilise un fusil long pour infliger de lourds dégâts à distance.",
			"Peut soigner ses alliés tout en infligeant des dégâts aux ennemis.",
			"Libère un large rayon de lumière, affectant amis et ennemis sur sa route.",
			"Épouse de Lucian, autrefois emprisonnée par Thresh dans sa lanterne.",
		],
	},
	{
		answer: "Seraphine",
		hints: [
			"Mage et star montante de la scène musicale.",
			"Peut amplifier sa portée d'attaque grâce à des compétences.",
			"Utilise des notes de musique pour soigner et infliger des dégâts.",
			"Esprit d'équipe : sa capacité ultime charme en ligne droite.",
			"Pop star à la chevelure rose et adepte des concerts.",
		],
	},
	{
		answer: "Sett",
		hints: [
			"Il est un chef de gang mi-homme, mi-vastaya avec un passé difficile.",
			"Sa mécanique consiste à infliger des dégâts plus forts à chaque coup reçu.",
			"Il utilise un coup qui projette les ennemis vers l'arrière.",
			"Il est célèbre pour son attaque puissante qui saisit un ennemi et le propulse au sol.",
			"Grand combattant à mains nues avec une passion pour les arènes de combat.",
		],
	},
	{
		answer: "Shaco",
		hints: [
			"Assassin malicieux qui aime piéger ses ennemis avec des illusions.",
			"Ses attaques critiques infligent des dégâts supplémentaires lorsqu'il attaque par derrière.",
			"Place des boîtes piégées qui effraient et endommagent les ennemis proches.",
			"Peut devenir invisible pour surprendre et attaquer par surprise ses cibles.",
			"Connu comme le bouffon démoniaque, il adore répandre le chaos.",
		],
	},
	{
		answer: "Shen",
		hints: [
			"C'est un ninja, mais aussi un tank qui protège ses alliés.",
			"Ses attaques déclenchent des effets en invoquant un esprit de l'épée.",
			"Se téléporte près d'un allié pour le sauver, rendant un bouclier.",
			"Peut créer une barrière qui bloque les dégâts entrants temporaires.",
			"Il protège l'équilibre et l'harmonie en tant qu'Œil du Crépuscule.",
		],
	},
	{
		answer: "Shyvana",
		hints: [
			"Originaire d'un peuple mi-dragon, mi-humain avec un passé mystérieux.",
			"Accumule de la fureur en attaquant pour devenir temporairement une créature puissante.",
			"Ses auto-attaques infligent des dégâts supplémentaires sur la durée.",
			"Se transforme en un puissant dragon, infligeant des dégâts en zone.",
			"Protectrice loyale du roi de Demacia, elle incarne une dragonne de feu.",
		],
	},
	{
		answer: "Singed",
		hints: [
			"Un alchimiste fou qui a perdu tout respect pour la vie.",
			"Laisse une traînée de poison derrière lui lorsqu'il se déplace.",
			"Peut projeter un ennemi par-dessus son épaule.",
			"Porte une énorme carafe remplie de produits chimiques sur son dos.",
			"Connu pour courir en empoisonnant tout sur son passage.",
		],
	},
	{
		answer: "Sion",
		hints: [
			"Colosse mort-vivant autrefois un redoutable guerrier.",
			"Sa barre de vie est remplacée par un bouclier lors de son ultime.",
			"Il déclenche une explosion en différé sur sa cible.",
			"Peut s'élancer en ligne droite, renversant tout sur son passage.",
			"Revient temporairement à la vie après sa mort, devenant plus fort.",
		],
	},
	{
		answer: "Sivir",
		hints: [
			"C'est une redoutable chasseuse de trésors et mercenaire.",
			"Elle utilise un boomerang qui revient après avoir touché des ennemis.",
			"Ses attaques rebondissent entre les ennemis, touchant plusieurs cibles.",
			"Peut temporairement augmenter sa vitesse et celle de ses alliés proches.",
			"Connue pour son rôle central dans des conflits du désert.",
		],
	},
	{
		answer: "Skarner",
		hints: [
			"Prédateur du désert, créature à six pattes dotée de piquants acérés.",
			"Se déplace rapidement grâce à des cristaux disséminés sur la carte.",
			"Peut stocker de l'énergie pour se déplacer et infliger plus de dégâts.",
			"Son ultime attrape un ennemi et le traîne sur une courte distance.",
			"Un scorpion massif au cœur de cristal venant des terres arides.",
		],
	},
	{
		answer: "Smolder",
		hints: [
			"Ce champion n'existe pas dans League of Legends.",
			"Vérifie le nom ou consulte une base de données officielle.",
			"Il n'est pas connu pour ses compétences magiques ou physiques.",
			"Aucun lien avec des régions connues ou factions célèbres.",
			"Cherche un autre personnage pour jouer à ce jeu.",
		],
	},
	{
		answer: "Sona",
		hints: [
			"Support mystique doué dans la manipulation du son.",
			"Utilise des auras pour conférer divers bonus à ses alliés.",
			"Joue de l'éthérune, un instrument aussi visuellement iconique qu'utile.",
			"Peut émettre un puissant crescendo qui étourdit ses ennemis.",
			"Connue pour son silence, elle communique par sa musique enchanteresse.",
		],
	},
	{
		answer: "Soraka",
		hints: [
			"Ancienne gardienne céleste reniant son immortalité pour aider le monde.",
			"Son rôle principal est de soigner et soutenir ses alliés à distance.",
			"Capable de réduire le silence de ses ennemis dans une zone.",
			"Peut soigner en masse tous ses alliés peu importe la distance.",
			"Une soigneuse qui vient des étoiles, avec une corne sur le front.",
		],
	},
	{
		answer: "Swain",
		hints: [
			"Tacticien intelligent et manipulateur au sein d'une grande armée.",
			"Se transforme partiellement en un être ailé lors des combats.",
			"Utilise des oiseaux pour terrifier et attaquer ses ennemis.",
			"Peut drainer la vie de plusieurs adversaires à proximité.",
			"Commandant au bras démoniaque qui contrôle des corbeaux.",
		],
	},
	{
		answer: "Sylas",
		hints: [
			"Mage rebelle, emprisonné pendant des années pour ses pouvoirs.",
			"Capable de copier les ultimes des autres champions temporairement.",
			"Utilise des chaînes lourdes pour attaquer et se battre en mêlée.",
			"Absorbe la magie environnante pour se renforcer en combat.",
			"Surnommé « Le Semeur de Rébellion » pour sa lutte contre l'oppression.",
		],
	},
	{
		answer: "Syndra",
		hints: [
			"Mage puissante en quête de perfection et de contrôle absolu.",
			"Accumule des sphères noires qu'elle utilise pour ses capacités.",
			"Sa capacité ultime utilise un nombre élevé de sphères pour infliger des dégâts.",
			"Peut redisposer ses sphères sur le champ de bataille à volonté.",
			"Connu pour son titre de Souveraine des Sphères.",
		],
	},
	{
		answer: "Tahm Kench",
		hints: [
			"Support et tank, il appartient à la classe des hommes-bêtes.",
			"Peut dévorer alliés ou ennemis, les gardant dans son ventre.",
			"Sa langue est capable d'infliger un étourdissement à distance.",
			"Peut voyager sur de longues distances avec un allié en guise de passager.",
			"Surnommé le Roi des Rivières, souvent comparé à un démon du fleuve.",
		],
	},
	{
		answer: "Taliyah",
		hints: [
			"Mage et tisseuse de pierres talentueuse en quête de maîtrise de son pouvoir.",
			"Peut se déplacer rapidement sur un terrain qu'elle a modifié auparavant.",
			"Sa capacité à contrôler le terrain gêne les mouvements ennemis en combat.",
			"Crée un mur massif pour diviser le champ de bataille à sa guise.",
			"Connue pour manipuler les roches, elle est souvent comparée à une tisseuse.",
		],
	},
	{
		answer: "Talon",
		hints: [
			"Assassin humain, membre d'une organisation de voleurs et d'assassins.",
			"Utilise des lames qui se déploient et reviennent vers lui.",
			"Peut sauter par-dessus les murs pour se déplacer.",
			"Ses attaques laissent une marque sur l'ennemi qui explose ensuite.",
			"Connait bien Katarina grâce à leur lien avec une organisation.",
		],
	},
	{
		answer: "Taric",
		hints: [
			"Ancien protecteur et guerrier, lié à l'aspect cosmique de la protection.",
			"Peut guérir ses alliés en utilisant son énergie céleste.",
			"Ses attaques de base améliorées soignent les alliés proches.",
			"Rend ses alliés invulnérables pendant un court moment.",
			"Il est connu comme le bouclier de Valoran avec une forte affinité pour les cristaux.",
		],
	},
	{
		answer: "Teemo",
		hints: [
			"Un yordle souriant souvent considéré comme un éclaireur.",
			"Lance des dards empoisonnés augmentant la toxicité au fil des attaques.",
			"Peut se rendre invisible lorsqu'il reste immobile dans les buissons.",
			"Place des champignons explosifs et toxiques pour piéger ses ennemis.",
			"Portant un béret vert, il est l'un des personnages les plus détestés.",
		],
	},
	{
		answer: "Thresh",
		hints: [
			"Il est un esprit torturé provenant d'un lieu hanté.",
			"Capacité à contrôler les ennemis avec des chaînes et des crochets.",
			"Sa lanterne peut capturer des âmes et aider à sauver des alliés.",
			"Utilise un crochet pour attirer et immobiliser un ennemi à distance.",
			"Connu pour sa lanterne qui offre un moyen d'évasion sûr.",
		],
	},
	{
		answer: "Tristana",
		hints: [
			"Tireur yordle connu pour son amour des explosions et des gros canons.",
			"Utilise un sort qui augmente sa portée d'attaque temporairement.",
			"Possède une compétence qui lui permet de sauter de façon explosive.",
			"Peut poser une bombe sur un ennemi qui explose après quelques secondes.",
			"Référence à un certain canon géant qu'elle aime beaucoup utiliser.",
		],
	},
	{
		answer: "Trundle",
		hints: [
			"C'est un troll roi, souvent associé aux régions glaciales.",
			"Il utilise un bâton qui se transforme en une colonne de glace.",
			"Il peut se soigner en volant les statistiques de ses ennemis.",
			"Aime dire qu'il va \"casser\" des adversaires.",
			"Il est souvent surnommé le Roi des Trolls.",
		],
	},
	{
		answer: "Tryndamere",
		hints: [
			"C'est un roi-barbare connu pour sa soif de vengeance.",
			"Il utilise une mécanique unique qui augmente ses chances de coup critique.",
			"Sa jauge de ressource se remplit en infligeant ou subissant des dégâts.",
			"Peut devenir temporairement immortel pour relancer ses attaques dévastatrices.",
			"Il hurle de rage et sa fureur est légendaire sur les champs de bataille.",
		],
	},
	{
		answer: "Twisted Fate",
		hints: [
			"C'est un mage et un escroc originaire d'un lieu mystérieux.",
			"Il utilise des cartes magiques pour infliger des dégâts à distance.",
			"Ses compétences comprennent un lancer de cartes qui se fait par lots de trois.",
			"Peut choisir entre trois types de cartes, chacune avec un effet distinct.",
			"Son pouvoir emblématique lui permet de se téléporter n'importe où sur la carte.",
		],
	},
	{
		answer: "Twitch",
		hints: [
			"Tireur sournois et rusé, transformé par des expérimentations sauvages.",
			"Se camoufle temporairement pour surprendre ses ennemis avec des attaques.",
			"Empoisonne ses cibles avec chaque projectile, infligeant des dégâts sur la durée.",
			"Dispose d'une attaque ultime qui traverse les ennemis en ligne droite.",
			"Un rat humanoïde qui aime particulièrement le fromage puant.",
		],
	},
	{
		answer: "Udyr",
		hints: [
			"Un homme-bête qui canalise l'énergie des esprits animaux.",
			"Peut alterner entre plusieurs postures inspirées d'animaux.",
			"Son style de jeu repose sur des transformations uniques et continues.",
			"Il utilise des griffes de tigre pour infliger de rapides dégâts.",
			"Vagabond spirituel, il incarne l'essence de plusieurs bêtes.",
		],
	},
	{
		answer: "Urgot",
		hints: [
			"Cyborg colosse, rejeté par une grande nation pour ses méthodes brutales.",
			"Se déplace grâce à des jambes mécaniques pouvant tirer à distance.",
			"Ses coups de feu proviennent de mitrailleuses fixées sur ses jambes.",
			"Possède un grappin, attirant l'ennemi vers lui pour l'exécuter.",
			"Connu pour sa silhouette massive et ses membres robotisés.",
		],
	},
	{
		answer: "Varus",
		hints: [
			"Un Darkin qui a fusionné avec deux chasseurs ioniens.",
			"Peut charger son attaque pour infliger plus de dégâts à distance.",
			"Ses attaques infligent des dégâts supplémentaires en appliquant les coups de blight.",
			"Peut immobiliser les adversaires avec une chaîne de corruption.",
			"Archer, il utilise un arc pour tirer des flèches d'énergie noire.",
		],
	},
	{
		answer: "Vayne",
		hints: [
			"Chasseuse de monstres déterminée, traumatisée par un événement tragique de son enfance.",
			"Peut effectuer une roulade agile pour repositionnement rapide en combat.",
			"Ses attaques deviennent plus puissantes en frappant le même ennemi trois fois.",
			"Invoque une énorme arbalète pour envoyer un ennemi contre un mur.",
			"Une combattante acrobatique qui traque sans relâche les créatures des ténèbres.",
		],
	},
	{
		answer: "Veigar",
		hints: [
			"Un yordle à la recherche de la puissance noire ultime.",
			"Capacité à enfermer ses ennemis dans une cage magique en forme de mur.",
			"Accumule des stacks de puissance magique en éliminant des sbires ou des champions.",
			"Peut infliger des dégâts massifs avec une explosion de magie noire.",
			"Le plus petit mais le plus puissant des maîtres des arcanes.",
		],
	},
	{
		answer: "Vel'Koz",
		hints: [
			"Mage de la créature du Néant, curieux et avide de connaissances.",
			"Utilise des sorts à longue portée nécessitant une précision extrême.",
			"Sa mobilité est réduite, mais il inflige des dégâts massifs en zone.",
			"Peut immobiliser les ennemis avec un sort en forme de ligne.",
			"Utilise un rayon dévastateur qui dissout tout sur son passage.",
		],
	},
	{
		answer: "Vex",
		hints: [
			"Yordle mélancolique avec une affinité pour l'ombre et la tristesse.",
			"Capable de stopper les mouvements de ses adversaires avec ses compétences.",
			"Projette une ombre pour infliger des dégâts et effrayer ses ennemis.",
			"Peut se téléporter vers sa cible marquée et infliger des dégâts.",
			"Utilise une ombre comme compagnon, portant souvent un pull à capuche.",
		],
	},
	{
		answer: "Vi",
		hints: [
			"C'est une ancienne criminelle devenue membre des forces de l'ordre.",
			"Son style se concentre sur les attaques en mêlée puissantes et explosives.",
			"Possède des gants mécaniques géants qui amplifient sa force.",
			"Elle peut se propulser rapidement vers un ennemi, l'assommant et le projetant.",
			"C'est la partenaire d'une tireuse d'élite avec une grande affinité pour la technologie.",
		],
	},
	{
		answer: "Viego",
		hints: [
			"Ancien roi mort-vivant consumé par le désir de retrouver sa bien-aimée.",
			"Peut posséder brièvement le corps de ses ennemis vaincus.",
			"Utilise une dague magique et une cape sombre en combat.",
			"Sa compétence signature crée une onde de choc sombre autour de lui.",
			"Connu comme le Roi Déchu, cherchant désespérément à ressusciter sa reine.",
		],
	},
	{
		answer: "Viktor",
		hints: [
			"Mage et inventeur avec une obsession pour l'élévation par la technologie.",
			"Peut améliorer ses sorts en collectant des ressources spécifiques au fil de la partie.",
			"Utilise un rayon laser linéaire pour infliger des dégâts en zone.",
			"Possède un dispositif qui crée un champ de ralentissement et d'étourdissement.",
			"Connu pour son bras robotique et son amour des évolutions technologiques.",
		],
	},
	{
		answer: "Vladimir",
		hints: [
			"Mage hémomancien qui manipule le sang pour détruire ses ennemis.",
			"Sa régénération est basée sur les dégâts infligés aux adversaires.",
			"Peut temporairement devenir intouchable en se transformant en une flaque de sang.",
			"Absorbe la vie de ses ennemis pour ensuite la relâcher en une explosion sanglante.",
			"Personnage qui se nourrit littéralement des fluides de ses adversaires.",
		],
	},
	{
		answer: "Warwick",
		hints: [
			"Chasseur brutal transformé en une créature mi-homme mi-bête.",
			"Possède une soif de sang qui lui confère une vitesse accrue.",
			"Peut sauter sur une cible à une grande distance.",
			"Le sang des ennemis blessés l'attire et le rend plus puissant.",
			"Loup-garou avec des griffes métalliques et un hurlement terrifiant.",
		],
	},
	{
		answer: "Wukong",
		hints: [
			"Guerrier rusé et agile inspiré d'un célèbre personnage mythologique.",
			"Peut créer des clones pour tromper ses ennemis et échapper aux attaques.",
			"Se déplace rapidement et gagne temporairement de la vitesse d'attaque.",
			"Fait tourbillonner son bâton pour projeter en l'air les ennemis proches.",
			"Un singe maître du bâton, souvent en quête d'amélioration personnelle.",
		],
	},
	{
		answer: "Xayah",
		hints: [
			"Une rebelle rakan, dotée de plumes aiguisées et déterminée.",
			"Elle peut rappeler ses plumes pour infliger des dégâts à la fois.",
			"Ses attaques laissent des plumes sur le sol après l'impact.",
			"Peut devenir brièvement intouchable en effectuant un bond gracieux en arrière.",
			"S'est alliée au séducteur Rakan pour protéger leur peuple.",
		],
	},
	{
		answer: "Xerath",
		hints: [
			"Mage ascendant, animé par le désir insatiable de puissance.",
			"Capable de frapper ses ennemis de très loin avec ses compétences.",
			"Peut immobiliser ses ennemis avec une chaîne d'énergie.",
			"Libère une série de tirs d'artillerie à longue portée.",
			"Son corps est une entité d'énergie arcanique enfermée dans une enveloppe.",
		],
	},
	{
		answer: "Xin Zhao",
		hints: [
			"Loyal et téméraire, il est un membre clé de la garde royale.",
			"Il se spécialise dans les combats rapprochés avec sa lance.",
			"Il possède une attaque qui repousse les ennemis autour de lui.",
			"Peut bloquer les dégâts provenant de loin pendant quelques secondes.",
			"Chargé d'attaquer et de servir un roi avec ses compétences de combat exceptionnelles.",
		],
	},
	{
		answer: "Yasuo",
		hints: [
			"Épéiste errant et maudit, accusé à tort du meurtre de son maître.",
			"Un bretteur très mobile qui manie le vent au combat.",
			"Peut ériger un mur mouvant qui bloque tous les projectiles.",
			"Traverse sbires et ennemis d'un dash sans réelle limite.",
			"Le frère de Yone, fidèle à une seule et unique épée.",
		],
	},
	{
		answer: "Yone",
		hints: [
			"Un ancien guerrier redevenu vivant, partagé entre deux esprits.",
			"Peut infliger des dégâts massifs grâce à ses attaques critiques.",
			"Combine habilement les pouvoirs spirituels et physiques en combat.",
			"Possède une capacité qui attire les ennemis en ligne droite vers lui.",
			"Le frère de Yasuo, ressuscité avec un masque sur le visage.",
		],
	},
	{
		answer: "Yorick",
		hints: [
			"Gravedigger solitaire, lié aux Îles Obscures, manipulateur de morts-vivants.",
			"Utilise des petites créatures macabres pour attaquer les ennemis.",
			"Peut invoquer une servante puissante pour l'accompagner au combat.",
			"Possède une capacité qui enferme les ennemis dans une zone clôturée.",
			"Connu pour porter une pelle et un crâne sur son bâton.",
		],
	},
	{
		answer: "Yuumi",
		hints: [
			"Support magique qui accompagne un ami inséparable.",
			"Peut s'attacher à n'importe quel allié pour lui fournir des bonus.",
			"Capable de se déplacer rapidement entre les alliés sans utiliser de sort.",
			"Projette une série de vagues d'énergie qui immobilisent les ennemis.",
			"C'est un chat avec un livre magique parlant.",
		],
	},
	{
		answer: "Zac",
		hints: [
			"Il est une créature créée par accident suite à des expériences chimiques.",
			"Ses bras s'étirent pour attraper et étourdir ses ennemis.",
			"Peut bondir très loin et atterrir en infligeant des dégâts de zone.",
			"Sa capacité à se régénérer est liée à la collecte de morceaux verts.",
			"Sa forme est celle d'une masse gélatineuse verte et rebondissante.",
		],
	},
	{
		answer: "Zed",
		hints: [
			"Ninja maître des ombres, autrefois membre d'un ancien ordre.",
			"Peut se cloner pour frapper à distance et se repositionner.",
			"Visuellement reconnaissable par son armure sombre et son masque.",
			"Utilise une technique qui marque sa cible pour des dégâts supplémentaires.",
			"Adversaire juré de Shen, et utilisateur principal de l'énergie des ombres.",
		],
	},
	{
		answer: "Zeri",
		hints: [
			"Tireuse née mais dotée d'une énergie électrique intense et incontrôlable.",
			"Peut décharger des éclairs qui rebondissent entre les ennemis.",
			"Se déplace plus vite lorsqu'elle marche près d'un mur.",
			"Charge une puissante attaque qui traverse les ennemis en ligne.",
			"Surnommée la foudre vivante, elle incarne la vitesse et l'électricité.",
		],
	},
	{
		answer: "Ziggs",
		hints: [
			"Cet expert en explosifs est un yordle excentrique et ingénieux.",
			"Il utilise principalement des bombes pour infliger des dégâts massifs à distance.",
			"Un trait distinctif est son rire maniaque après chaque explosion réussie.",
			"Peut lancer une bombe qui rebondit avant d'exploser à l'impact.",
			"Il aime les explosions plus que tout et rêve de faire sauter le monde entier.",
		],
	},
	{
		answer: "Zilean",
		hints: [
			"Gardien du temps et chronomancien érudit.",
			"Peut réduire le délai de récupération de ses capacités.",
			"Projette des bombes temporelles qui explosent après un certain temps.",
			"Capable de remonter le cours du temps pour ressusciter un allié.",
			"Porte une longue barbe et une horloge sur son dos.",
		],
	},
	{
		answer: "Zoe",
		hints: [
			"Cette entité espiègle appartient à la catégorie des aspects célestes.",
			"Capable de créer des bulles qui endorment les ennemis au contact.",
			"Ses sorts peuvent récupérer des sorts d'invocateur tombés au sol.",
			"Peut se téléporter sur une courte distance puis retourner instantanément.",
			"Connue pour sa personnalité malicieuse et ses cheveux multicolores.",
		],
	},
	{
		answer: "Zyra",
		hints: [
			"Support végétaliste, mystérieuse incarnation de la flore.",
			"Peut invoquer des graines qui se transforment en plantes.",
			"Crée des murs de ronces pour entraver les ennemis.",
			"Peut déclencher un soulèvement massif de plantes sur une large zone.",
			"Souvent appelée la \"Reine des Ronces\" par les joueurs.",
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
