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
	championSquareUrl,
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

const FUSIONS = [
	{
		a: "Yasuo",
		b: "Jhin",
		name: "Yashinh",
		vibe: "L'un manie une lame de vent, l'autre compte ses balles jusqu'à quatre avant l'exécution finale.",
	},
	{
		a: "Thresh",
		b: "Pyke",
		name: "Thryke",
		vibe: "Une lanterne qui rappelle les alliés d'un côté, un harpon qui tire les ennemis de l'autre : deux supports assassins.",
	},
	{
		a: "Lux",
		b: "Morgana",
		name: "Luxgana",
		vibe: "Deux mages capables d'immobiliser avec une racine, l'une lumineuse et l'autre corrompue.",
	},
	{
		a: "Zed",
		b: "Shen",
		name: "Zhen",
		vibe: "Deux ninjas rivaux liés par le clan Kinkou, l'un a trahi l'ordre, l'autre le protège encore.",
	},
	{
		a: "Jinx",
		b: "Zeri",
		name: "Jineri",
		vibe: "Deux tireuses de Zaun, l'une électrique et rapide, l'autre armée de lance-roquettes improvisés.",
	},
	{
		a: "Sett",
		b: "Braum",
		name: "Brautt",
		vibe: "Un bouclier qui protège les alliés d'un côté, un crochet qui tire les ennemis vers soi de l'autre.",
	},
	{
		a: "Ahri",
		b: "Evelynn",
		name: "Ahrilynn",
		vibe: "Deux assassines mages, l'une charme avec ses sorts, l'autre se rend invisible hors combat.",
	},
	{
		a: "Draven",
		b: "Darius",
		name: "Dravarius",
		vibe: "Deux frères noxiens réunis sur la faille, l'un jongle avec ses haches, l'autre accumule les cumuls de saignement.",
	},
	{
		a: "Yuumi",
		b: "Rengar",
		name: "Yuumgar",
		vibe: "Un chasseur qui bondit depuis les buissons, une chatte magique qui s'attache à un allié pour le soigner.",
	},
	{
		a: "Wukong",
		b: "Shaco",
		name: "Wuco",
		vibe: "Un clone illusoire d'un côté, une invisibilité et des doubles d'un autre : deux jungles spécialistes de la ruse.",
	},
	{
		a: "Malphite",
		b: "Rammus",
		name: "Malmmus",
		vibe: "Deux tanks capables de s'enrouler et de foncer sur leur cible, l'un de pierre, l'autre blindé.",
	},
	{
		a: "Teemo",
		b: "Shaco",
		name: "Teeco",
		vibe: "Un tireur qui pose des champignons empoisonnés, un bouffon qui laisse des boîtes-pièges : la carte se transforme en champ miné.",
	},
	{
		a: "Blitzcrank",
		b: "Nautilus",
		name: "Blitzilus",
		vibe: "Un crochet mécanique qui attire l'adversaire, une ancre qui l'entrave : deux supports engageurs de bas de faille.",
	},
	{
		a: "Vayne",
		b: "Kai'Sa",
		name: "Vain'Sa",
		vibe: "Deux tireuses redoutées des tanks, l'une inflige des dégâts proportionnels aux points de vie, l'autre envoie des missiles guidés.",
	},
	{
		a: "Katarina",
		b: "Samira",
		name: "Katamira",
		vibe: "Deux assassines qui réinitialisent leurs sorts après une élimination, capables d'enchaîner les cibles à répétition.",
	},
	{
		a: "Aatrox",
		b: "Mordekaiser",
		name: "Aatrokaiser",
		vibe: "Un épéiste qui se soigne en frappant, un porteur d'âmes qui isole sa cible dans une arène des ombres.",
	},
	{
		a: "Nasus",
		b: "Veigar",
		name: "Nasigar",
		vibe: "Deux champions qui deviennent plus puissants en accumulant des cumuls, l'un en fauchant des sbires, l'autre en tuant des ennemis.",
	},
	{
		a: "Ekko",
		b: "Zilean",
		name: "Ekkean",
		vibe: "Deux manipulateurs du temps de Zaun, l'un revient en arrière pour éviter sa propre mort, l'autre ralentit ou accélère celle des autres.",
	},
	{
		a: "Ashe",
		b: "Sejuani",
		name: "Ashjuani",
		vibe: "Deux figures du Freljord capables d'étourdir, l'une avec une flèche de givre à longue portée, l'autre en chargeant au corps à corps sur sa monture.",
	},
	{
		a: "Riven",
		b: "Irelia",
		name: "Rivelia",
		vibe: "Deux combattantes de mêlée agiles, l'une enchaîne trois bonds avec un bouclier, l'autre plante des lames au sol pour rebondir dessus.",
	},
	{
		a: "Fizz",
		b: "Zoe",
		name: "Fizoe",
		vibe: "Deux mages de mi-voie insaisissables, l'une envoie une bulle qui endort, l'autre devient intouchable en plongeant sous l'eau.",
	},
	{
		a: "Lee Sin",
		b: "Yasuo",
		name: "Lee Suo",
		vibe: "Un moine du jungle dont le coup de pied envoie les ennemis en l'air, un manieur d'épée dont la tornade les y maintient.",
	},
	{
		a: "Garen",
		b: "Darius",
		name: "Gararius",
		vibe: "Deux champions de haut de faille dont l'ultime peut exécuter directement une cible affaiblie.",
	},
	{
		a: "Sona",
		b: "Seraphine",
		name: "Sonaphine",
		vibe: "Deux supports musiciennes, l'une joue une mélodie qui soigne, l'autre chante un accord final qui charme.",
	},
	{
		a: "Kayn",
		b: "Viego",
		name: "Kayego",
		vibe: "Un chasseur qui peut posséder le corps de ses victimes, un roi déchu qui possède celui de ses ennemis vaincus.",
	},
	{
		a: "Volibear",
		b: "Sion",
		name: "Volision",
		vibe: "Deux tanks du Freljord et de Noxus, l'un est un ours électrique, l'autre un mort-vivant qui charge en grossissant.",
	},
	{
		a: "Camille",
		b: "Fiora",
		name: "Camiora",
		vibe: "Deux combattantes de haut de faille précises, l'une manie des lames en ciseaux, l'autre riposte à chaque parade réussie.",
	},
	{
		a: "Illaoi",
		b: "Cho'Gath",
		name: "Illagath",
		vibe: "Une prêtresse qui frappe avec des tentacules, un monstre du Néant qui grossit à chaque élimination.",
	},
	{
		a: "Jayce",
		b: "Poppy",
		name: "Jayppy",
		vibe: "Deux inventeurs de Piltover, l'un transforme son marteau en canon à distance, l'autre transforme le sien en mur infranchissable.",
	},
	{
		a: "Gnar",
		b: "Gragas",
		name: "Gnaragas",
		vibe: "Deux champions du haut de faille qui se transforment sous la colère, l'un grandit en version géante, l'autre pousse un tonneau explosif.",
	},
	{
		a: "Renekton",
		b: "Nasus",
		name: "Renasus",
		vibe: "Deux frères égyptiens de Shurima, tous deux capables d'accumuler des cumuls en tuant des sbires.",
	},
	{
		a: "Ornn",
		b: "Malphite",
		name: "Ornphite",
		vibe: "Un forgeron du Freljord qui fabrique des objets pour son équipe, un colosse de pierre entièrement fait de roche.",
	},
	{
		a: "Kled",
		b: "Tahm Kench",
		name: "Kledench",
		vibe: "Un cavalier noxien accompagné de sa monture, une créature du Néant qui avale ses ennemis dans une autre dimension.",
	},
	{
		a: "Urgot",
		b: "Skarner",
		name: "Urgoner",
		vibe: "Un ancien champion de Zaun aux pattes mécaniques, un scorpion de cristal du Vide capable de saisir et immobiliser sa cible.",
	},
	{
		a: "Singed",
		b: "Dr. Mundo",
		name: "Singundo",
		vibe: "Deux chimistes zaunites, l'un laisse un nuage toxique derrière lui, l'autre se soigne avec des injections improbables.",
	},
	{
		a: "Aurora",
		b: "Lissandra",
		name: "Aurandra",
		vibe: "Deux mages liées au Freljord, l'une maîtrise le givre après une transformation, l'autre commande la glace éternelle.",
	},
	{
		a: "Warwick",
		b: "Rengar",
		name: "Warengar",
		vibe: "Deux chasseurs du jungle qui traquent leur cible affaiblie, l'un est un homme-loup, l'autre un guerrier-fauve.",
	},
	{
		a: "Elise",
		b: "Zac",
		name: "Elisac",
		vibe: "Deux champions du jungle capables de changer de forme, l'une passe humaine et araignée, l'autre se divise en gelée élémentaire.",
	},
	{
		a: "Nidalee",
		b: "Rek'Sai",
		name: "Nidasai",
		vibe: "Deux chasseuses du jungle, l'une lance sa javelot à distance sous forme de cougar, l'autre surgit du sol en creusant des tunnels.",
	},
	{
		a: "Vi",
		b: "Jayce",
		name: "Viyce",
		vibe: "Deux forces de Piltover, l'une charge à travers les murs avec ses poings mécaniques, l'autre en érige avec son marteau.",
	},
	{
		a: "Kindred",
		b: "Karthus",
		name: "Kindarthus",
		vibe: "Deux figures liées à la mort dans le jungle, un duo de chasseur et de louve spectrale, un mage capable d'exécuter avec son requiem.",
	},
	{
		a: "Ivern",
		b: "Maokai",
		name: "Ivkai",
		vibe: "Deux esprits de la nature du jungle, l'un pacifiste refuse de tuer, l'autre est un ancien féroce qui protège la forêt.",
	},
	{
		a: "Nunu & Willump",
		b: "Trundle",
		name: "Nuntrundle",
		vibe: "Deux champions du Freljord, un duo qui pousse une boule de neige grossissante, un troll qui vole la force de ses adversaires.",
	},
	{
		a: "Diana",
		b: "Leona",
		name: "Dieona",
		vibe: "Deux ennemies jurées liées au Solari et au Lunari, l'une invoque la lune, l'autre le soleil.",
	},
	{
		a: "Zyra",
		b: "Bard",
		name: "Zyrard",
		vibe: "Deux supports imprévisibles, l'une invoque des plantes carnivores, l'autre voyage à travers des portails cosmiques.",
	},
	{
		a: "Rakan",
		b: "Xayah",
		name: "Rakayah",
		vibe: "Un couple de vastayas inséparables, l'un charme ses ennemis, l'autre les transperce de plumes tranchantes.",
	},
	{
		a: "Renata Glasc",
		b: "Orianna",
		name: "Renatorianna",
		vibe: "Deux femmes de pouvoir de Zaun et Piltover, l'une retourne un allié ennemi contre son équipe, l'autre protège les siens avec un bouclier.",
	},
	{
		a: "Milio",
		b: "Janna",
		name: "Miljanna",
		vibe: "Deux supports polyvalents, l'un réchauffe et soigne ses alliés, l'autre projette les ennemis en l'air avec une tornade.",
	},
	{
		a: "Senna",
		b: "Lucian",
		name: "Sennacian",
		vibe: "Un couple maudit d'Ionie, tous deux tireurs, liés par une malédiction qui les a séparés puis réunis dans le combat.",
	},
	{
		a: "Varus",
		b: "Cassiopeia",
		name: "Varopeia",
		vibe: "Deux tireurs à distance corrompus par le Néant ou transformés en serpent, tous deux capables d'affaiblir durablement leur cible.",
	},
	{
		a: "Twitch",
		b: "Singed",
		name: "Twinged",
		vibe: "Deux tireurs de Zaun liés au poison, l'un se cache et empoisonne discrètement, l'autre en asperge tout le terrain.",
	},
	{
		a: "Ezreal",
		b: "Corki",
		name: "Ezorki",
		vibe: "Deux tireurs de Piltover mobiles en bas de faille, l'un esquive avec un bond arrière, l'autre pilote un petit véhicule volant.",
	},
	{
		a: "Xerath",
		b: "Vel'Koz",
		name: "Xerkoz",
		vibe: "Deux mages de mi-voie à très longue portée, l'un shurimien manie un sceptre magique, l'autre est une créature du Vide.",
	},
	{
		a: "Anivia",
		b: "Swain",
		name: "Anivain",
		vibe: "Une créature glaciale du Freljord qui érige un mur de glace, un général noxien accompagné d'un corbeau qui grandit avec le chaos de la bataille.",
	},
	{
		a: "Twisted Fate",
		b: "Neeko",
		name: "Twisteeko",
		vibe: "Deux maîtres du déguisement, l'un joue avec des cartes truquées, l'autre prend l'apparence de ses adversaires.",
	},
	{
		a: "Ryze",
		b: "Taliyah",
		name: "Ryliyah",
		vibe: "Deux mages liés à la pierre et à la magie runique, l'un manie des runes anciennes, l'autre façonne la roche à volonté.",
	},
	{
		a: "Annie",
		b: "Amumu",
		name: "Annumu",
		vibe: "Deux mages à l'apparence enfantine, l'une invoque un ours en peluche enflammé, l'autre est une momie enveloppée de bandages pleurants.",
	},
	{
		a: "Heimerdinger",
		b: "Ziggs",
		name: "Heimggs",
		vibe: "Deux inventeurs qui bombardent la zone, l'un place des tourelles automatiques, l'autre lance des bombes en rafale.",
	},
	{
		a: "Zilean",
		b: "Bard",
		name: "Zilard",
		vibe: "Deux supports qui manipulent l'espace-temps, l'un ralentit ou accélère le temps, l'autre ouvre des portails de téléportation.",
	},
	{
		a: "Soraka",
		b: "Nami",
		name: "Sorami",
		vibe: "Deux supports soigneurs increvables, l'une projette ses soins à travers toute la carte, l'autre chevauche une vague pour étourdir.",
	},
	{
		a: "Karma",
		b: "Taric",
		name: "Karic",
		vibe: "Deux supports protecteurs, l'une amplifie ses sorts de bouclier avec un mantra, l'autre rend un allié invincible en se sacrifiant.",
	},
	{
		a: "Alistar",
		b: "Leona",
		name: "Alistona",
		vibe: "Deux supports engageurs redoutés en bas de faille, l'un enchaîne un coup de tête et un écrasement, l'autre combine éclipse solaire et lunaire.",
	},
	{
		a: "Pantheon",
		b: "Galio",
		name: "Panthalio",
		vibe: "Deux combattants du haut de faille venus des cieux, l'un plonge avec sa lance depuis les airs, l'autre s'écrase depuis le ciel sous forme de statue.",
	},
	{
		a: "Quinn",
		b: "Kayle",
		name: "Quinkayle",
		vibe: "Deux figures ailées de Demacia, l'une éclaireuse accompagnée d'un aigle, l'autre une ange justicière volante.",
	},
	{
		a: "Vladimir",
		b: "Aatrox",
		name: "Vladrox",
		vibe: "Deux champions increvables du haut de faille qui se soignent en drainant la vie de leurs ennemis.",
	},
	{
		a: "Fiddlesticks",
		b: "Shaco",
		name: "Fiddaco",
		vibe: "Deux jungles maîtres de la peur et de l'illusion, l'un se déguise en épouvantail pour effrayer, l'autre crée des leurres trompeurs.",
	},
	{
		a: "Brand",
		b: "Xerath",
		name: "Branath",
		vibe: "Deux mages spécialistes des combats d'équipe, l'un propage des étourdissements enflammés en chaîne, l'autre attaque à très longue portée.",
	},
	{
		a: "Syndra",
		b: "Orianna",
		name: "Syndriana",
		vibe: "Deux mages capables de dégâts massifs en un seul sort, l'une fait exploser des sphères, l'autre protège puis fait détoner sa boule.",
	},
	{
		a: "LeBlanc",
		b: "Neeko",
		name: "LeNeeko",
		vibe: "Deux mages assassines expertes du déguisement, l'une laisse un leurre à sa place, l'autre prend l'apparence de ses ennemis.",
	},
	{
		a: "Viktor",
		b: "Zac",
		name: "Viktac",
		vibe: "Deux créations de Zaun, l'un se transforme en machine surpuissante, l'autre est une gelée capable de se scinder en plusieurs corps.",
	},
	{
		a: "Akali",
		b: "Talon",
		name: "Akalon",
		vibe: "Deux assassins ioniens qui se dissimulent dans l'ombre avant de frapper leur cible isolée.",
	},
	{
		a: "Qiyana",
		b: "Taliyah",
		name: "Qiyaliyah",
		vibe: "Deux combattantes capables de manipuler la pierre pour créer des murs et changer le terrain de bataille.",
	},
	{
		a: "Zoe",
		b: "Lulu",
		name: "Zoelu",
		vibe: "Deux mages au style enfantin, l'une envoie une bulle qui endort, l'autre transforme ses ennemis en poro inoffensif.",
	},
	{
		a: "Veigar",
		b: "Malzahar",
		name: "Veigahar",
		vibe: "Deux mages de mi-voie du Néant et de Bandle, l'un emprisonne sa cible dans une cage, l'autre la supprime totalement avec son ultime.",
	},
	{
		a: "Kassadin",
		b: "Ekko",
		name: "Kassekko",
		vibe: "Deux mages liés au Néant, capables tous deux de se téléporter rapidement pour échapper au danger.",
	},
	{
		a: "Aphelios",
		b: "Kai'Sa",
		name: "Aphesa",
		vibe: "Deux tireurs de bas de faille complexes, l'un jongle avec cinq armes différentes, l'autre évolue son arme au fil de la partie.",
	},
	{
		a: "Miss Fortune",
		b: "Caitlyn",
		name: "Missdillyn",
		vibe: "Deux tireuses de Piltover et Bilgewater, l'une fait pleuvoir des balles, l'autre pose des pièges qui immobilisent à distance.",
	},
	{
		a: "Jhin",
		b: "Ashe",
		name: "Jhinshe",
		vibe: "Deux tireurs à distance, l'un compte quatre balles théâtrales avant l'exécution, l'autre envoie une flèche qui gèle sa cible.",
	},
	{
		a: "Kog'Maw",
		b: "Cho'Gath",
		name: "Kogath",
		vibe: "Deux créatures du Néant qui grandissent en dévorant leurs ennemis et les structures adverses.",
	},
	{
		a: "Xin Zhao",
		b: "Jarvan IV",
		name: "Xin Jarvan",
		vibe: "Deux princes de Demacia liés par une rivalité, l'un manie une lance qui étourdit, l'autre enferme ses ennemis avec un mur de drapeaux.",
	},
	{
		a: "Olaf",
		b: "Tryndamere",
		name: "Olamere",
		vibe: "Deux guerriers du Freljord qui frappent plus fort à mesure que leurs points de vie diminuent.",
	},
	{
		a: "Yorick",
		b: "Mordekaiser",
		name: "Yordekaiser",
		vibe: "Deux champions liés à la mort, l'un invoque une armée de goules avec sa pelle, l'autre bannit sa cible dans un royaume des ombres.",
	},
	{
		a: "Rell",
		b: "Poppy",
		name: "Relpoppy",
		vibe: "Deux engageurs de Piltover et Bandle, l'une s'écrase du ciel avec sa monture mécanique, l'autre stoppe les déplacements ennemis avec son marteau.",
	},
	{
		a: "Braum",
		b: "Alistar",
		name: "Braumstar",
		vibe: "Deux supports engageurs increvables de bas de faille, l'un se protège avec un bouclier, l'autre projette ses ennemis avec un coup de tête.",
	},
	{
		a: "Nautilus",
		b: "Skarner",
		name: "Nautkarner",
		vibe: "Deux tanks capables d'entraver longuement leur cible, l'un avec une ancre, l'autre avec des pinces de cristal du Vide.",
	},
	{
		a: "Pyke",
		b: "Vladimir",
		name: "Pykladimir",
		vibe: "Un support de Bilgewater qui exécute les cibles affaiblies, un vampire increvable qui restaure sa vie en drainant ses ennemis.",
	},
	{
		a: "Rumble",
		b: "Gnar",
		name: "Rumnar",
		vibe: "Deux champions du haut de faille qui deviennent incontrôlables sous pression, l'un surchauffe sa machine, l'autre se transforme sous la rage.",
	},
	{
		a: "Shyvana",
		b: "Aurelion Sol",
		name: "Shyvasol",
		vibe: "Deux champions à moitié ou entièrement dragons, l'une se transforme sous forme de dragon local, l'autre est un dragon cosmique ancestral.",
	},
	{
		a: "Wukong",
		b: "Jarvan IV",
		name: "Wujarvan",
		vibe: "Deux champions du haut de faille, l'un crée des clones illusoires pour tromper, l'autre enferme ses ennemis derrière un mur de drapeaux.",
	},
	{
		a: "Sylas",
		b: "Ryze",
		name: "Sylryze",
		vibe: "Deux mages ioniens liés à la magie interdite, l'un vole les ultimes de ses ennemis, l'autre manie une magie runique ancienne increvable.",
	},
	{
		a: "Zac",
		b: "Sion",
		name: "Zacion",
		vibe: "Deux champions du haut de faille difficiles à achever définitivement, l'un renaît en petites gelées, l'autre se relève brièvement après sa mort.",
	},
	{
		a: "Nilah",
		b: "Yone",
		name: "Nilone",
		vibe: "Deux combattants agiles, l'une manie un fouet et se soigne en attaquant, l'autre est une âme jumelle vengeresse capable de multiples bonds.",
	},
	{
		a: "K'Sante",
		b: "Sett",
		name: "K'Sett",
		vibe: "Deux champions du haut de faille, l'un se transforme en colosse imposant, l'autre frappe le sol avec ses poings pour étourdir.",
	},
	{
		a: "Briar",
		b: "Vi",
		name: "Briavi",
		vibe: "Deux créations de Zaun au jungle, l'une entre en frénésie sanguinaire incontrôlable, l'autre charge à travers les murs avec ses poings.",
	},
	{
		a: "Hwei",
		b: "Neeko",
		name: "Hweeko",
		vibe: "Deux mages qui manipulent les apparences, l'un peint des créatures issues de ses émotions, l'autre imite la forme de ses cibles.",
	},
	{
		a: "Smolder",
		b: "Shyvana",
		name: "Smolvana",
		vibe: "Deux champions liés aux dragons, l'un est un bébé dragon qui grandit à chaque élimination, l'autre une guerrière à moitié dragon.",
	},
	{
		a: "Naafiri",
		b: "Rengar",
		name: "Naafingar",
		vibe: "Deux chasseurs du jungle qui traquent en embuscade, l'une invoque une meute de chiens spectraux, l'autre se rend invisible avant de bondir.",
	},
	{
		a: "Bel'Veth",
		b: "Cho'Gath",
		name: "Belgath",
		vibe: "Deux créatures du Vide qui grandissent en puissance au fil de la partie, l'une gouverne comme impératrice, l'autre dévore tout ce qui bouge.",
	},
	{
		a: "Zeri",
		b: "Ezreal",
		name: "Zerael",
		vibe: "Deux tireurs à distance très mobiles, capables tous deux d'esquiver constamment grâce à des déplacements rapides.",
	},
	{
		a: "Ambessa",
		b: "Sett",
		name: "Ambett",
		vibe: "Deux combattants redoutés du haut de faille, l'une est une générale noxienne implacable, l'autre un chef de gang increvable capable d'encaisser.",
	},
	{
		a: "Mel",
		b: "Renata Glasc",
		name: "Melata",
		vibe: "Deux figures de Piltover et Zaun, l'une renvoie les sorts adverses avec son miroir, l'autre retourne un allié ennemi contre son équipe.",
	},
	{
		a: "Taric",
		b: "Nautilus",
		name: "Taritilus",
		vibe: "Deux supports résistants, l'un est un gardien stellaire protecteur increvable, l'autre traque et entrave sa cible avec une ancre.",
	},
	{
		a: "Lillia",
		b: "Ivern",
		name: "Lillern",
		vibe: "Deux esprits paisibles du jungle, l'une est un faon qui endort ses ennemis, l'autre un jardinier pacifiste qui refuse le combat direct.",
	},
];

@Component({
	selector: "app-fusion-champions",
	standalone: true,
	imports: [FormsModule, ChampionSelectComponent, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./fusion-champions.component.html",
	styleUrl: "./fusion-champions.component.scss",
})
export class FusionChampionsComponent implements OnDestroy {
	private fusions = [...FUSIONS];

	square(name: string) {
		return championSquareUrl(name);
	}

	private shuffleFusions() {
		this.fusions = [...FUSIONS];

		for (let i = this.fusions.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.fusions[i], this.fusions[j]] = [this.fusions[j], this.fusions[i]];
		}
	}

	protected readonly championOptions = CHAMPION_OPTIONS;
	protected readonly pointsPerFusion = 10;
	maxRounds = computed(() =>
		this.mix.active()
			? this.mix.roundSize()
			: this.settings.roundsFor("fusion-champions"),
	);
	index = signal(0);
	submittedToMix = signal(false);
	score = signal(0);
	correctCount = signal(0);
	locked = signal(false);
	/** Resultat du round en cours, pilote l'overlay de verdict cinematique. */
	verdict = signal<"correct" | "wrong" | "timeout" | null>(null);
	/** Verdict individuel par moitie de fusion, pour animer chaque champion separement. */
	firstOk = signal(false);
	secondOk = signal(false);
	lastGain = signal(0);
	/**
	 * Vrai pendant le changement de round : masque les deux splashs instantanement
	 * (transition CSS coupee) jusqu'au `load` des nouvelles images. Sans ca, la
	 * nouvelle paire apparait en clair ~1s le temps que le deflou du round
	 * precedent se re-applique en sens inverse.
	 */
	splashesPending = signal(0);
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
	first = "";
	second = "";
	fusion = computed(() => this.fusions[this.index() % this.fusions.length]);
	roundNumber = computed(() => this.index() + 1);
	finished = computed(() => this.index() >= this.maxRounds());
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
		protected room: RoomService,
		protected mix: MixRuntimeService,
		protected settings: GameSettingsService,
		private readonly audio: AudioService,
	) {
		this.shuffleFusions();
		this.startRoundTimer();
		this.room.onGameRestarted((payload) => {
			if (this.destroyed) return;
			if (payload.gameId === "fusion-champions") this.restart();
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
		// Entree animee de chaque round (fusion qui punch, barre d'action qui glisse).
		effect(() => {
			this.index();
			if (this.finished()) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".fusion-stage-art"));
				slideUp(host.querySelector(".fusion-vibe"), { delay: 0.08 });
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
		this.firstOk.set(false);
		this.secondOk.set(false);
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
		return championSplashUrl(name);
	}
	onSplashLoaded() {
		this.splashesPending.update((n) => Math.max(0, n - 1));
	}
	validate() {
		if (this.locked()) return;
		this.timer.stop();
		const host = this.hostElement.nativeElement;
		const stage = host.querySelector(".cine-stage") as HTMLElement | null;
		const vals = [
			normalizeChampionName(this.first),
			normalizeChampionName(this.second),
		];
		const f = this.fusion();
		const normA = normalizeChampionName(f.a);
		const normB = normalizeChampionName(f.b);
		const hasA = vals.includes(normA);
		const hasB = vals.includes(normB);
		this.firstOk.set(hasA);
		this.secondOk.set(hasB);
		const ok = hasA && hasB;
		if (ok) {
			const points = this.pointsPerFusion;
			this.lastGain.set(points);
			this.score.update((s) => s + 1);
			this.correctCount.update((c) => c + 1);
			this.verdict.set("correct");
			this.audio.play("correct");
			burstParticles(stage, {
				colors: ["#b673ff", "#e2c8ff", "#f0e6d2"],
				count: 36,
			});
			floatScore(stage, `+${points}`, "#b673ff");
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
		this.splashesPending.set(2);
		this.index.update((i) => i + 1);
		if (this.finished()) {
			this.timer.stop();
			this.submitMix();
			return;
		}
		this.first = "";
		this.second = "";
		this.verdict.set(null);
		this.firstOk.set(false);
		this.secondOk.set(false);
		this.locked.set(false);
		this.startRoundTimer();
	}
	submitMix() {
		if (this.submittedToMix()) return;
		this.submittedToMix.set(true);
		this.room.submitMixSegment(
			this.score() * 10,
			`Fusion : ${this.correctCount()}/${this.maxRounds()} duos trouvés.`,
		);
	}
	requestRestart() {
		if (!this.room.isHost()) return;
		this.room.restartGame("fusion-champions");
	}
	restart() {
		this.shuffleFusions();
		clearTimeout(this.autoNextTimer);
		this.splashesPending.set(2);
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.correctCount.set(0);
		this.first = "";
		this.second = "";
		this.verdict.set(null);
		this.firstOk.set(false);
		this.secondOk.set(false);
		this.lastGain.set(0);
		this.locked.set(false);
		this.startRoundTimer();
	}
}
