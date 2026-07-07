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
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { championSplashUrl, championSquareUrl } from "../../shared/lol-assets";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { RoundTimer } from "../../shared/round-timer";
import { animateEndScreen } from "../../shared/end-screen-animate";
import { AudioService } from "../../core/services/audio.service";
import {
	burstParticles,
	floatScore,
	pulse,
	punchIn,
	shake,
	slideUp,
} from "../../shared/cinematic/cinematic";

interface IntrusItem {
	/** Champion utilise pour l'illustration (square art), meme quand `label` montre un skin. */
	champion: string;
	label: string;
}
interface IntrusRound {
	group: IntrusItem[];
	intrus: IntrusItem;
	category: string;
	explanation: string;
}

const c = (name: string): IntrusItem => ({ champion: name, label: name });
const skin = (champion: string, label: string): IntrusItem => ({ champion, label });

const ROUNDS: IntrusRound[] = [
	{
		group: [c("Garen"), c("Lux"), c("Jarvan IV"), c("Fiora")],
		intrus: c("Darius"),
		category: "Region : Demacia",
		explanation: "Darius est Noxien, les quatre autres sont Demaciens.",
	},
	{
		group: [c("Darius"), c("Draven"), c("Katarina"), c("Swain")],
		intrus: c("Garen"),
		category: "Region : Noxus",
		explanation: "Garen est Demacien, les quatre autres viennent de Noxus.",
	},
	{
		group: [c("Yasuo"), c("Irelia"), c("Zed"), c("Akali")],
		intrus: c("Caitlyn"),
		category: "Region : Ionia",
		explanation: "Caitlyn vient de Piltover, les quatre autres sont Ioniens.",
	},
	{
		group: [c("Jayce"), c("Caitlyn"), c("Heimerdinger"), c("Camille")],
		intrus: c("Jinx"),
		category: "Region : Piltover",
		explanation: "Jinx vient de Zaun, les quatre autres sont de Piltover.",
	},
	{
		group: [c("Jinx"), c("Viktor"), c("Singed"), c("Dr. Mundo")],
		intrus: c("Braum"),
		category: "Region : Zaun",
		explanation: "Braum vient du Freljord, les quatre autres sont de Zaun.",
	},
	{
		group: [c("Braum"), c("Ashe"), c("Sejuani"), c("Olaf")],
		intrus: c("Diana"),
		category: "Region : Freljord",
		explanation: "Diana vient du Mont Targon, les quatre autres sont du Freljord.",
	},
	{
		group: [c("Azir"), c("Nasus"), c("Renekton"), c("Xerath")],
		intrus: c("Cho'Gath"),
		category: "Region : Shurima",
		explanation: "Cho'Gath vient du Neant, les quatre autres sont Shurimans.",
	},
	{
		group: [c("Cho'Gath"), c("Kog'Maw"), c("Kha'Zix"), c("Vel'Koz")],
		intrus: c("Miss Fortune"),
		category: "Region : le Neant",
		explanation: "Miss Fortune vient de Bilgewater, les quatre autres sont des creatures du Neant.",
	},
	{
		group: [c("Miss Fortune"), c("Gangplank"), c("Graves"), c("Twisted Fate")],
		intrus: c("Ashe"),
		category: "Region : Bilgewater",
		explanation: "Ashe vient du Freljord, les quatre autres sont de Bilgewater.",
	},
	{
		group: [c("Jinx"), c("Caitlyn"), c("Vayne"), c("Ashe")],
		intrus: c("Lux"),
		category: "Role : ADC",
		explanation: "Lux est mage, les quatre autres sont des tireurs (ADC).",
	},
	{
		group: [c("Thresh"), c("Braum"), c("Leona"), c("Nami")],
		intrus: c("Jhin"),
		category: "Role : Support",
		explanation: "Jhin est un tireur (ADC), les quatre autres sont supports.",
	},
	{
		group: [c("Lee Sin"), c("Vi"), c("Kha'Zix"), c("Master Yi")],
		intrus: c("Darius"),
		category: "Role : Jungle",
		explanation: "Darius joue top, les quatre autres sont junglers.",
	},
	{
		group: [c("Garen"), c("Fiora"), c("Camille"), c("Renekton")],
		intrus: c("Jarvan IV"),
		category: "Role : Top",
		explanation: "Jarvan IV joue jungle, les quatre autres jouent top.",
	},
	{
		group: [c("Malphite"), c("Ornn"), c("Rammus"), c("Sion")],
		intrus: c("Zed"),
		category: "Role : Tank",
		explanation: "Zed est un assassin, les quatre autres sont des tanks.",
	},
	{
		group: [c("Ahri"), c("Syndra"), c("Orianna"), c("Viktor")],
		intrus: c("Garen"),
		category: "Role : Mage",
		explanation: "Garen est un bruiser top-lane, les quatre autres sont des mages.",
	},
	{
		group: [c("Vayne"), c("Kai'Sa"), c("Ezreal"), c("Xayah")],
		intrus: c("Nami"),
		category: "Role : ADC",
		explanation: "Nami est support, les quatre autres sont des tireurs (ADC).",
	},
	{
		group: [c("Lux"), c("Ahri"), c("Annie"), c("Malzahar")],
		intrus: c("Akali"),
		category: "Ressource : Mana",
		explanation: "Akali utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Ahri"), c("Syndra"), c("Orianna"), c("Xerath")],
		intrus: c("Zed"),
		category: "Ressource : Mana",
		explanation: "Zed utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Ashe"), c("Caitlyn"), c("Jinx"), c("Sivir")],
		intrus: c("Tryndamere"),
		category: "Ressource : Mana",
		explanation: "Tryndamere utilise de la Fureur, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Illaoi"), c("Camille"), c("Fiora"), c("Darius")],
		intrus: c("Shen"),
		category: "Ressource : Mana",
		explanation: "Shen utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Amumu"), c("Sejuani"), c("Nunu & Willump"), c("Warwick")],
		intrus: c("Kha'Zix"),
		category: "Ressource : Mana",
		explanation: "Kha'Zix n'utilise aucune ressource, les quatre autres utilisent du Mana.",
	},
	{
		group: [c("Xerath"), c("Orianna"), c("Veigar"), c("Syndra")],
		intrus: c("Kennen"),
		category: "Ressource : Mana",
		explanation: "Kennen utilise de l'Energie, les quatre autres utilisent du Mana.",
	},
	{
		group: [
			skin("Yasuo", "PROJECT: Yasuo"),
			skin("Aatrox", "Blood Moon Aatrox"),
			skin("Miss Fortune", "Arcade Miss Fortune"),
			skin("Ahri", "Spirit Blossom Ahri"),
		],
		intrus: skin("Lux", "Elementalist Lux"),
		category: "Skin : rarete",
		explanation: "Elementalist Lux est un skin Ultimate (le palier le plus rare), les quatre autres sont des skins classiques.",
	},
	{
		group: [
			skin("Zed", "PROJECT: Zed"),
			skin("Senna", "High Noon Senna"),
			skin("Ahri", "K/DA Ahri"),
			skin("Jinx", "Star Guardian Jinx"),
		],
		intrus: skin("Sona", "DJ Sona"),
		category: "Skin : rarete",
		explanation: "DJ Sona est un skin Ultimate, les quatre autres sont des skins classiques.",
	},
	{
		group: [c("Vi"), c("Ekko"), c("Warwick"), c("Zeri")],
		intrus: c("Sejuani"),
		category: "Region : Zaun",
		explanation: "Sejuani vient du Freljord, les quatre autres sont originaires de Zaun.",
	},
	{
		group: [c("Sejuani"), c("Volibear"), c("Udyr"), c("Trundle")],
		intrus: c("Kled"),
		category: "Region : Freljord",
		explanation: "Kled vient de Noxus, les quatre autres sont du Freljord.",
	},
	{
		group: [c("Vladimir"), c("Mordekaiser"), c("Sion"), c("Swain")],
		intrus: c("Anivia"),
		category: "Region : Noxus",
		explanation: "Anivia est un esprit gardien du Freljord, les quatre autres sont Noxiens.",
	},
	{
		group: [c("Nasus"), c("Amumu"), c("Renekton"), c("Skarner")],
		intrus: c("Bel'Veth"),
		category: "Region : Shurima",
		explanation: "Bel'Veth est l'Imperatrice du Neant, les quatre autres sont lies a Shurima.",
	},
	{
		group: [c("Pantheon"), c("Diana"), c("Leona"), c("Aurelion Sol")],
		intrus: c("Taric"),
		category: "Region : Mont Targon",
		explanation: "Taric est Demacien devenu Protecteur du Soleil, les quatre autres sont nes sur le Mont Targon.",
	},
	{
		group: [c("Thresh"), c("Hecarim"), c("Kalista"), c("Karthus")],
		intrus: c("Sion"),
		category: "Region : Iles Obscures",
		explanation: "Sion est un mort-vivant noxien ressuscite par la science, pas par la malediction des Iles Obscures comme les quatre autres.",
	},
	{
		group: [c("Teemo"), c("Tristana"), c("Corki"), c("Poppy")],
		intrus: c("Rakan"),
		category: "Region : Bandle City",
		explanation: "Rakan est un Vastaya d'Ionia, les quatre autres sont des yordles de Bandle City.",
	},
	{
		group: [c("Vex"), c("Zyra"), c("Elise"), c("Evelynn")],
		intrus: c("Poppy"),
		category: "Theme : figures sombres et menacantes",
		explanation: "Poppy est une yordle bienveillante en quete du veritable Heros de Demacia, les quatre autres incarnent des menaces sombres ou predatrices.",
	},
	{
		group: [c("Cho'Gath"), c("Vel'Koz"), c("Kog'Maw"), c("Kha'Zix")],
		intrus: c("Kayn"),
		category: "Theme : creatures du Neant",
		explanation: "Kayn est un assassin Ionien porteur de la lame Darkin Rhaast, les quatre autres sont des creatures du Neant.",
	},
	{
		group: [c("Aatrox"), c("Varus"), c("Kayn"), c("Naafiri")],
		intrus: c("Viego"),
		category: "Lignee : Darkin",
		explanation: "Viego est le Roi Ruine, un esprit des Iles Obscures sans lien avec les Darkins, les quatre autres portent une arme ou influence Darkin.",
	},
	{
		group: [c("Rakan"), c("Xayah"), c("Nidalee"), c("Neeko")],
		intrus: c("Vex"),
		category: "Lignee : Vastaya",
		explanation: "Vex est une yordle des Iles Obscures, les quatre autres sont des Vastaya.",
	},
	{
		group: [c("Vi"), c("Renata Glasc"), c("Viktor"), c("Urgot")],
		intrus: c("Rengar"),
		category: "Region : Zaun",
		explanation: "Rengar vient de la jungle de Kumungu, les quatre autres sont lies a Zaun.",
	},
	{
		group: [c("Lucian"), c("Senna"), c("Yone"), c("Kayn")],
		intrus: c("Diana"),
		category: "Theme : chasseurs de morts-vivants ou d'ombres",
		explanation: "Diana est une pretresse du Mont Targon en rupture avec son ordre, les quatre autres traquent des morts-vivants ou des ombres.",
	},
	{
		group: [c("Ezreal"), c("Twisted Fate"), c("Taliyah"), c("Qiyana")],
		intrus: c("Malphite"),
		category: "Theme : aventuriers voyageurs",
		explanation: "Malphite est un colosse de roche garde de Shurima qui ne quitte guere sa terre, les quatre autres sont des aventuriers globe-trotters.",
	},
	{
		group: [c("Zed"), c("Kayn"), c("Talon"), c("Naafiri")],
		intrus: c("Sett"),
		category: "Role : Assassin",
		explanation: "Sett est un combattant bruiser, les quatre autres sont des assassins.",
	},
	{
		group: [c("Karma"), c("Janna"), c("Soraka"), c("Yuumi")],
		intrus: c("Ryze"),
		category: "Role : Support",
		explanation: "Ryze est un mage battlemage joue mid ou top, les quatre autres sont des supports.",
	},
	{
		group: [c("Nautilus"), c("Alistar"), c("Leona"), c("Rell")],
		intrus: c("Morgana"),
		category: "Theme : engage au corps a corps",
		explanation: "Morgana immobilise et frappe a distance avec ses sorts, les quatre autres sont des supports qui plongent au corps a corps.",
	},
	{
		group: [c("Ziggs"), c("Heimerdinger"), c("Corki"), c("Rumble")],
		intrus: c("Gnar"),
		category: "Theme : yordles bricoleurs et technologie",
		explanation: "Gnar est un yordle antique prehistorique fige dans la glace, les quatre autres sont des yordles inventeurs ou pilotes de machines.",
	},
	{
		group: [c("Veigar"), c("Poppy"), c("Tristana"), c("Kennen")],
		intrus: c("Vex"),
		category: "Type : yordle",
		explanation: "Vex est une yordle des Iles Obscures marquee par le chagrin, les quatre autres sont des yordles de Bandle City.",
	},
	{
		group: [c("Kled"), c("Rammus"), c("Nunu & Willump"), c("Volibear")],
		intrus: c("Warwick"),
		category: "Theme : champion accompagne d'une monture ou d'un compagnon",
		explanation: "Warwick est lui-meme une bete transformee, sans monture distincte, les quatre autres combattent avec un compagnon dedie.",
	},
	{
		group: [c("Malzahar"), c("Kog'Maw"), c("Cho'Gath"), c("Kassadin")],
		intrus: c("Xerath"),
		category: "Theme : creatures ou voyageurs du Neant",
		explanation: "Xerath est un mage shurimain fait de pure energie arcanique sans lien avec le Neant, les quatre autres y sont directement lies.",
	},
	{
		group: [c("Jax"), c("Yorick"), c("Nasus"), c("Fiddlesticks")],
		intrus: c("Sylas"),
		category: "Theme : armes ou objets insolites",
		explanation: "Sylas combat avec des chaines et vole la magie d'autrui, les quatre autres manient des objets detournes de leur usage (lampadaire, pelle, epouvantail).",
	},
	{
		group: [c("Jinx"), c("Ziggs"), c("Tristana"), c("Corki")],
		intrus: c("Ashe"),
		category: "Theme : explosifs et projectiles a fragmentation",
		explanation: "Ashe tire des fleches de glace, les quatre autres basent leur kit sur des explosifs.",
	},
	{
		group: [c("Vayne"), c("Aphelios"), c("Senna"), c("Lucian")],
		intrus: c("Draven"),
		category: "Theme : chasseurs de morts-vivants ou d'ombres",
		explanation: "Draven est un bourreau noxien qui aime le spectacle, les quatre autres traquent specifiquement des creatures des ombres ou morts-vivants.",
	},
	{
		group: [c("Renekton"), c("Nasus"), c("Azir"), c("Amumu")],
		intrus: c("Ashe"),
		category: "Region : Shurima",
		explanation: "Ashe est la Reine des Gelees, souveraine du Freljord, les quatre autres viennent de Shurima.",
	},
	{
		group: [c("Wukong"), c("Master Yi"), c("Lee Sin"), c("Kennen")],
		intrus: c("Jarvan IV"),
		category: "Region : Ionia",
		explanation: "Jarvan IV est Demacien, les quatre autres sont Ioniens.",
	},
	{
		group: [c("Xin Zhao"), c("Jarvan IV"), c("Garen"), c("Fiora")],
		intrus: c("Wukong"),
		category: "Region : Demacia",
		explanation: "Wukong est Ionien, les quatre autres sont Demaciens.",
	},
	{
		group: [c("Ekko"), c("Zilean"), c("Bard"), c("Rumble")],
		intrus: c("Zeri"),
		category: "Theme : manipulation du temps ou de l'espace",
		explanation: "Zeri manipule l'electricite, pas le temps, les quatre autres ont un pouvoir lie au temps ou a des passages spatio-temporels.",
	},
	{
		group: [c("Kassadin"), c("Twisted Fate"), c("Shen"), c("Taliyah")],
		intrus: c("Katarina"),
		category: "Capacite signature : teleportation longue distance",
		explanation: "Katarina se deplace par courts dashs sur ses poignards, les quatre autres possedent une teleportation a longue portee.",
	},
	{
		group: [c("Ezreal"), c("Riven"), c("Vi"), c("Camille")],
		intrus: c("Amumu"),
		category: "Capacite signature : dash",
		explanation: "Amumu n'a aucun dash dans son kit, les quatre autres ont un sort de deplacement rapide en ligne.",
	},
	{
		group: [c("Lissandra"), c("Ashe"), c("Anivia"), c("Trundle")],
		intrus: c("Twitch"),
		category: "Theme : magie de la glace",
		explanation: "Twitch est un rat empoisonneur de Zaun, les quatre autres manient un pouvoir lie a la glace.",
	},
	{
		group: [c("Brand"), c("Annie"), c("Ziggs"), c("Malphite")],
		intrus: c("Nami"),
		category: "Theme : magie du feu ou de la roche",
		explanation: "Nami est une Vastaya des mers maitrisant l'eau, les quatre autres manient le feu ou la roche.",
	},
	{
		group: [c("Nami"), c("Fizz"), c("Pyke"), c("Illaoi")],
		intrus: c("Zyra"),
		category: "Theme : lies a la mer et Bilgewater",
		explanation: "Zyra est une entite vegetale nee des marais Shurimans, les quatre autres sont ancres a Bilgewater et a la mer.",
	},
	{
		group: [c("Gangplank"), c("Miss Fortune"), c("Graves"), c("Illaoi")],
		intrus: c("Fizz"),
		category: "Type : humain de Bilgewater",
		explanation: "Fizz est un Vastaya amphibie, les quatre autres sont des humains de Bilgewater.",
	},
	{
		group: [c("Jhin"), c("Caitlyn"), c("Ashe"), c("Varus")],
		intrus: c("Kai'Sa"),
		category: "Arme : arc ou arbalete",
		explanation: "Kai'Sa tire avec des armes bio-organiques du Neant, les quatre autres utilisent un arc ou une arbalete.",
	},
	{
		group: [c("Darius"), c("Olaf"), c("Tryndamere"), c("Illaoi")],
		intrus: c("Vayne"),
		category: "Ressource : Fureur ou absence de ressource",
		explanation: "Vayne utilise du Mana, les quatre autres combattent sans mana (Fureur ou absence de ressource).",
	},
	{
		group: [c("Akali"), c("Zed"), c("Kennen"), c("Shen")],
		intrus: c("Yasuo"),
		category: "Ressource : Energie",
		explanation: "Yasuo n'utilise ni Mana ni Energie : son Flux augmente en bougeant, les quatre autres utilisent de l'Energie.",
	},
	{
		group: [c("Renata Glasc"), c("Viktor"), c("Orianna"), c("Camille")],
		intrus: c("Jhin"),
		category: "Theme : augmentations et prothèses Hextech",
		explanation: "Jhin utilise un fusil-canon artisanal mais son corps reste organique, les quatre autres portent des augmentations ou creations Hextech.",
	},
	{
		group: [c("Jayce"), c("Ezreal"), c("Heimerdinger"), c("Caitlyn")],
		intrus: c("Ekko"),
		category: "Region : Piltover",
		explanation: "Ekko est un enfant des rues de Zaun, les quatre autres sont de Piltover.",
	},
	{
		group: [c("Singed"), c("Zac"), c("Dr. Mundo"), c("Warwick")],
		intrus: c("Vi"),
		category: "Theme : experiences chimiques ratees",
		explanation: "Vi porte des gantelets Hextech mais n'est pas le produit d'une experience, les quatre autres sont des createurs ou victimes d'experiences chimiques de Zaun.",
	},
	{
		group: [c("Karthus"), c("Viego"), c("Elise"), c("Maokai")],
		intrus: c("Kindred"),
		category: "Region : Iles Obscures",
		explanation: "Kindred sont des esprits primordiaux sans region d'origine fixe, les quatre autres sont lies aux Iles Obscures.",
	},
	{
		group: [c("Fiddlesticks"), c("Mordekaiser"), c("Maokai"), c("Yorick")],
		intrus: c("Ivern"),
		category: "Region : Iles Obscures",
		explanation: "Ivern est un druide bienveillant du Freljord, les quatre autres sont lies aux Iles Obscures.",
	},
	{
		group: [c("Maokai"), c("Ivern"), c("Zyra"), c("Neeko")],
		intrus: c("Bel'Veth"),
		category: "Theme : lie a la nature",
		explanation: "Bel'Veth regne sur le Neant, un royaume artificiel sans lien avec la nature, les quatre autres sont lies au monde vegetal ou naturel.",
	},
	{
		group: [c("Xayah"), c("Rakan"), c("Ahri"), c("Wukong")],
		intrus: c("Nami"),
		category: "Lignee : Vastaya",
		explanation: "Nami appartient au peuple des Marai, distinct des Vastaya terrestres, les quatre autres sont des Vastaya.",
	},
	{
		group: [c("Jinx"), c("Vi"), c("Caitlyn"), c("Ekko")],
		intrus: c("Zeri"),
		category: "Serie/univers : Arcane",
		explanation: "Zeri n'apparait pas dans la serie Arcane, les quatre autres en sont des personnages centraux.",
	},
	{
		group: [c("Garen"), c("Pyke"), c("Urgot"), c("Vladimir")],
		intrus: c("Xin Zhao"),
		category: "Capacite signature : execution/finisher",
		explanation: "Xin Zhao n'a pas de capacite d'execution dediee, les quatre autres possedent une ultime qui punit les cibles a faibles PV.",
	},
	{
		group: [c("Darius"), c("Garen"), c("Urgot"), c("Vladimir")],
		intrus: c("Katarina"),
		category: "Capacite signature : execution/finisher",
		explanation: "Katarina n'a pas de sort d'execution, les quatre autres possedent une ultime qui acheve les cibles a faibles PV.",
	},
	{
		group: [c("Blitzcrank"), c("Thresh"), c("Nautilus"), c("Pyke")],
		intrus: c("Nami"),
		category: "Capacite signature : crochet/grab a distance",
		explanation: "Nami n'a pas de crochet, les quatre autres tirent un crochet ou une chaine pour agripper un ennemi a distance.",
	},
	{
		group: [c("Leona"), c("Malphite"), c("Amumu"), c("Sejuani")],
		intrus: c("Rakan"),
		category: "Capacite signature : ultime AoE stun",
		explanation: "L'ultime de Rakan est un charme, pas un etourdissement de zone, les quatre autres ont une ultime qui stun en zone.",
	},
	{
		group: [c("Ahri"), c("Evelynn"), c("Rengar"), c("Talon")],
		intrus: c("Fiora"),
		category: "Capacite signature : invisibilite/camouflage",
		explanation: "Fiora n'a pas d'invisibilite, les quatre autres disposent d'un sort qui les rend invisibles ou camoufles.",
	},
	{
		group: [c("Shaco"), c("Twitch"), c("Vayne"), c("Akali")],
		intrus: c("Riven"),
		category: "Capacite signature : invisibilite/camouflage",
		explanation: "Riven n'a pas de camouflage, les quatre autres disposent d'un sort qui les rend invisibles ou camoufles.",
	},
	{
		group: [c("Anivia"), c("Zilean"), c("Karthus"), c("Sion")],
		intrus: c("Nasus"),
		category: "Capacite signature : passive liee a la renaissance ou a la survie apres la mort",
		explanation: "Nasus n'a pas de mecanique de retour d'entre les morts, les quatre autres possedent un sort ou une passive qui les fait revenir ou agir depuis l'au-dela.",
	},
	{
		group: [c("Malphite"), c("Hecarim"), c("Rammus"), c("Sion")],
		intrus: c("Nunu & Willump"),
		category: "Capacite signature : engage ultime en ligne droite",
		explanation: "L'ultime de Nunu & Willump est une zone qui explose, pas une charge en ligne droite, les quatre autres foncent en ligne droite pour initier.",
	},
	{
		group: [c("Jax"), c("Vi"), c("Sett"), c("Wukong")],
		intrus: c("Gnar"),
		category: "Region : origine inconnue ou mysterieuse",
		explanation: "Gnar vient du Freljord, une origine bien etablie ; les quatre autres ont un passe volontairement flou ou inconnu.",
	},
	{
		group: [c("Yone"), c("Yasuo"), c("Irelia"), c("Zed")],
		intrus: c("Kayn"),
		category: "Arme : lame de katana ou epee ionienne",
		explanation: "Kayn manie la faux Darkin Rhaast, les quatre autres combattent au sabre ou a l'epee ionienne.",
	},
	{
		group: [c("Tryndamere"), c("Fiora"), c("Yasuo"), c("Riven")],
		intrus: c("Jax"),
		category: "Arme : epee a une main",
		explanation: "Jax combat avec un lampadaire (arme contondante improvisee), les quatre autres manient une epee.",
	},
	{
		group: [c("Poppy"), c("Nasus"), c("Yorick"), c("Sona")],
		intrus: c("Lulu"),
		category: "Arme : arme contondante ou tranchante",
		explanation: "Lulu ne se bat pas au corps a corps mais via la magie et son familier Pix, les quatre autres manient marteau, faux ou instrument comme arme.",
	},
	{
		group: [c("Miss Fortune"), c("Twisted Fate"), c("Graves"), c("Yasuo")],
		intrus: c("Sivir"),
		category: "Skin iconique : theme far-west/gangster",
		explanation: "Sivir n'a pas de skin dans cette gamme thematique, les quatre autres possedent un skin emblematique au theme gangster ou far-west (High Noon, Bilgewater...).",
	},
	{
		group: [
			skin("Ezreal", "Pulsefire Ezreal"),
			skin("Jinx", "Program Jinx"),
			skin("Camille", "PROJECT: Camille"),
			skin("Vi", "PROJECT: Vi"),
		],
		intrus: skin("Lux", "Elementalist Lux"),
		category: "Skin : theme futuriste/technologique",
		explanation: "Elementalist Lux appartient a un univers magique elementaire, les quatre autres partagent un theme cybernetique ou futuriste.",
	},
	{
		group: [
			skin("Ahri", "Star Guardian Ahri"),
			skin("Jinx", "Star Guardian Jinx"),
			skin("Syndra", "Star Guardian Syndra"),
			skin("Miss Fortune", "Star Guardian Miss Fortune"),
		],
		intrus: skin("Lux", "Mecha Kingdoms Lux"),
		category: "Skin : ligne Star Guardian",
		explanation: "Mecha Kingdoms Lux appartient a un tout autre univers de skins, les quatre autres sont des skins Star Guardian.",
	},
	{
		group: [c("Garen"), c("Darius"), c("Yasuo"), c("Riven")],
		intrus: c("Nidalee"),
		category: "Type d'arme : epee",
		explanation: "Nidalee chasse avec une sarbacane et des lances, les quatre autres combattent a l'epee.",
	},
	{
		group: [c("Caitlyn"), c("Jhin"), c("Ashe"), c("Varus")],
		intrus: c("Twitch"),
		category: "Portee : combattant a distance elegant",
		explanation: "Twitch se bat au corps a corps furtif avant de tirer a l'arbalete de pres, les quatre autres sont des tireurs de precision a longue portee.",
	},
	{
		group: [c("Annie"), c("Lulu"), c("Yuumi"), c("Bard")],
		intrus: c("Zilean"),
		category: "Theme : compagnon ou familier dedie",
		explanation: "Zilean n'a pas de compagnon attitre, les quatre autres sont indissociables d'un familier (Tibbers, Pix, un chat, des Meeps).",
	},
	{
		group: [c("Sona"), c("Yuumi"), c("Karma"), c("Nami")],
		intrus: c("Brand"),
		category: "Role : Support d'enchantement/soin",
		explanation: "Brand est un mage de degats purs sans soin ni bouclier, les quatre autres sont des supports d'enchantement qui soignent ou protegent leurs allies.",
	},
	{
		group: [c("Xerath"), c("Vel'Koz"), c("Ziggs"), c("Zyra")],
		intrus: c("Ryze"),
		category: "Portee : mage siege longue distance immobile",
		explanation: "Ryze est un battlemage mobile qui se teleporte au contact, les quatre autres sont des mages a tres longue portee peu mobiles.",
	},
	{
		group: [c("Braum"), c("Alistar"), c("Leona"), c("Taric")],
		intrus: c("Bard"),
		category: "Capacite signature : bouclier d'equipe",
		explanation: "Bard n'a pas de bouclier dans son kit, les quatre autres possedent un sort de protection ou bouclier pour leurs allies.",
	},
	{
		group: [c("Aphelios"), c("Kalista"), c("Senna"), c("Yorick")],
		intrus: c("Ashe"),
		category: "Theme : lien avec un etre cher disparu",
		explanation: "Ashe n'est pas definie par le deuil d'un proche, les quatre autres ont un kit ou une histoire batie autour d'une perte ou d'un lien posthume.",
	},
	{
		group: [c("Kalista"), c("Hecarim"), c("Thresh"), c("Karthus")],
		intrus: c("Senna"),
		category: "Region : Iles Obscures",
		explanation: "Senna est originaire de Demacia avant d'etre emprisonnee dans la Lanterne Noire, les quatre autres sont nes des Iles Obscures.",
	},
	{
		group: [c("Wukong"), c("Sett"), c("Yone"), c("Yasuo")],
		intrus: c("K'Sante"),
		category: "Region : Ionia",
		explanation: "K'Sante vient de Nazumah, une cite-etat du Grand Barathrum pres de Shurima, les quatre autres sont Ioniens.",
	},
	{
		group: [c("Milio"), c("Renata Glasc"), c("Viktor"), c("Zac")],
		intrus: c("Bel'Veth"),
		category: "Region : Zaun/Ixtal",
		explanation: "Bel'Veth regne sur le Neant, les quatre autres sont lies a Zaun ou a Ixtal.",
	},
	{
		group: [c("Qiyana"), c("Neeko"), c("Milio"), c("Zyra")],
		intrus: c("Nidalee"),
		category: "Region : Ixtal",
		explanation: "Nidalee vient de Shurima, les quatre autres sont originaires d'Ixtal.",
	},
	{
		group: [c("Rengar"), c("Nidalee"), c("Elise"), c("Kled")],
		intrus: c("Qiyana"),
		category: "Capacite signature : forme animale/transformation",
		explanation: "Qiyana n'a pas de forme animale, les quatre autres peuvent se transformer ou invoquer une forme bestiale.",
	},
	{
		group: [c("Nocturne"), c("Evelynn"), c("Fiddlesticks"), c("Shaco")],
		intrus: c("Kled"),
		category: "Theme : incarnation de la peur ou de l'ombre",
		explanation: "Kled est un cavalier yordle bravache, les quatre autres incarnent des figures de peur ou d'horreur pure.",
	},
	{
		group: [c("Xin Zhao"), c("Jarvan IV"), c("Vayne"), c("Quinn")],
		intrus: c("Sylas"),
		category: "Region : Demacia",
		explanation: "Sylas est un mage-epeiste emprisonne devenu renegat et ennemi jure de Demacia, les quatre autres restent loyaux au royaume.",
	},
	{
		group: [c("Darius"), c("Katarina"), c("Talon"), c("LeBlanc")],
		intrus: c("Riven"),
		category: "Theme : loyaute a l'empire noxien",
		explanation: "Riven a fui et renie Noxus apres l'invasion d'Ionia, les quatre autres restent fideles au pouvoir noxien.",
	},
	{
		group: [c("Ashe"), c("Sejuani"), c("Braum"), c("Tryndamere")],
		intrus: c("Gnar"),
		category: "Type : humain du Freljord",
		explanation: "Gnar est un yordle prehistorique, les quatre autres sont des humains du Freljord.",
	},
	{
		group: [c("Amumu"), c("Azir"), c("Nasus"), c("Renekton")],
		intrus: c("Xerath"),
		category: "Theme : lie a une malediction ou un tombeau shurimain",
		explanation: "Xerath est un ancien mage devenu pure energie par ambition, sans malediction funeraire, les quatre autres sont lies a une tombe ou une malediction de l'ancienne Shurima.",
	},
	{
		group: [c("Viktor"), c("Jayce"), c("Camille"), c("Orianna")],
		intrus: c("Ekko"),
		category: "Theme : partisans devoues du Hextech officiel",
		explanation: "Ekko bricole sa propre technologie temporelle en marge des institutions, les quatre autres representent ou servent le pouvoir Hextech etabli.",
	},
	{
		group: [c("Soraka"), c("Nami"), c("Karma"), c("Milio")],
		intrus: c("Zilean"),
		category: "Capacite signature : soin direct des allies",
		explanation: "Zilean ralentit le temps et ressuscite mais ne soigne pas directement, les quatre autres possedent un sort de soin.",
	},
	{
		group: [c("Ashe"), c("Olaf"), c("Braum"), c("Tryndamere")],
		intrus: c("Volibear"),
		category: "Type : humain du Freljord",
		explanation: "Volibear est un dieu-ours primordial du Freljord, les quatre autres sont des humains.",
	},
	{
		group: [c("Zed"), c("Shen"), c("Akali"), c("Kennen")],
		intrus: c("Irelia"),
		category: "Theme : ordre ninja/Kinkou",
		explanation: "Irelia est une lame-danseuse ionienne independante des Kinkou, les quatre autres sont lies a l'Ordre du Kinkou ou aux clans ninjas d'Ionia.",
	},
	{
		group: [c("Jinx"), c("Silco"), c("Vi"), c("Ekko")],
		intrus: c("Caitlyn"),
		category: "Region : Zaun",
		explanation: "Caitlyn est la Sherif de Piltover, les quatre autres sont lies a Zaun.",
	},
	{
		group: [c("Nasus"), c("Renekton"), c("Amumu"), c("Rammus")],
		intrus: c("Sivir"),
		category: "Theme : gardiens ou creatures liees aux tombeaux shurimains",
		explanation: "Sivir est une mercenaire humaine descendante de la lignee shurimane mais sans lien avec les tombeaux, les quatre autres gardent ou hantent des tombeaux anciens.",
	},
	{
		group: [c("Twitch"), c("Singed"), c("Warwick"), c("Zac")],
		intrus: c("Jayce"),
		category: "Theme : produit des experiences chimiques de Zaun",
		explanation: "Jayce est un inventeur de Piltover specialiste du Hextech, les quatre autres sont issus d'experiences chimiques zaunites.",
	},
];

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

@Component({
	selector: "app-intrus",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./intrus.component.html",
	styleUrl: "./intrus.component.scss",
})
export class IntrusComponent implements OnDestroy {
	private rounds: IntrusRound[] = [];

	protected readonly basePoints = 10;
	protected readonly maxRounds = computed(() =>
		this.mix.active() ? this.mix.roundSize() : this.settings.roundsFor("intrus"),
	);
	protected index = signal(0);
	protected submittedToMix = signal(false);
	protected score = signal(0);
	protected correctCount = signal(0);
	protected locked = signal(false);
	protected pickedIndex = signal<number | null>(null);
	protected items = signal<IntrusItem[]>([]);
	protected intrusIndex = signal(0);
	/** Resultat du round en cours, pilote le style du stage cinematique (glow vert/rouge). */
	protected verdict = signal<"correct" | "wrong" | "timeout" | null>(null);
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

	round = computed(() => this.rounds[this.index() % this.rounds.length]);
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
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly settings: GameSettingsService,
		private readonly audio: AudioService,
	) {
		this.shuffleRounds();
		this.setupRound();
		this.startRoundTimer();
		this.room.onGameRestarted((payload) => {
			if (this.destroyed) return;
			if (payload.gameId === "intrus") this.restart();
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
		// Entree animee de chaque round (grille qui punch, barre d'action qui glisse).
		effect(() => {
			this.index();
			if (this.finished()) return;
			requestAnimationFrame(() => {
				const host = this.hostElement.nativeElement;
				punchIn(host.querySelector(".suspects-grid"));
				slideUp(host.querySelector(".stage-caption"), { delay: 0.06 });
				slideUp(host.querySelector(".action-bar"), { delay: 0.12 });
			});
		});
	}

	ngOnDestroy(): void {
		this.destroyed = true;
		this.timer.stop();
		clearTimeout(this.autoNextTimer);
	}

	private shuffleRounds(): void {
		this.rounds = shuffle(ROUNDS);
	}

	private setupRound(): void {
		const r = this.round();
		const shuffled = shuffle([...r.group, r.intrus]);
		this.items.set(shuffled);
		this.intrusIndex.set(shuffled.indexOf(r.intrus));
	}

	private startRoundTimer(): void {
		this.timer.start(
			this.settings.roundTimeSec(),
			(secondsLeft) => this.remainingSec.set(secondsLeft),
			() => this.handleTimeout(),
		);
	}

	private handleTimeout(): void {
		if (this.locked()) return;
		this.verdict.set("timeout");
		this.locked.set(true);
		this.audio.play("timeout");
		this.audio.play("reveal", { volume: 0.6 });
		this.scheduleAutoNext();
	}

	/** Enchaine automatiquement apres le verdict pour garder le rythme (le bouton Suivant reste dispo pour zapper). */
	private scheduleAutoNext(): void {
		clearTimeout(this.autoNextTimer);
		this.autoNextTimer = setTimeout(() => this.next(), 3200);
	}

	square(name: string): string {
		return championSquareUrl(name);
	}

	splash(name: string): string {
		return championSplashUrl(name);
	}

	pick(i: number): void {
		if (this.locked()) return;
		this.timer.stop();
		const host = this.hostElement.nativeElement;
		const stage = host.querySelector(".cine-stage") as HTMLElement | null;
		this.pickedIndex.set(i);
		this.locked.set(true);
		const ok = i === this.intrusIndex();
		if (ok) {
			this.score.update((s) => s + 1);
			this.correctCount.update((c) => c + 1);
			this.verdict.set("correct");
			this.audio.play("correct");
			const card = host.querySelector(
				`.choice[data-index="${i}"]`,
			) as HTMLElement | null;
			burstParticles(stage, {
				colors: ["#3fd67a", "#e0a94a", "#f0e6d2"],
				count: 36,
			});
			floatScore(stage, `+${this.basePoints}`);
			if (card) pulse(card, 1.12);
		} else {
			this.verdict.set("wrong");
			this.audio.play("wrong");
			shake(stage);
		}
		this.audio.play("reveal", { volume: 0.6 });
		this.scheduleAutoNext();
	}

	next(): void {
		if (!this.locked()) return;
		clearTimeout(this.autoNextTimer);
		this.audio.play("swap", { volume: 0.7 });
		this.index.update((i) => i + 1);
		if (this.finished()) {
			this.timer.stop();
			this.submitMix();
			return;
		}
		this.pickedIndex.set(null);
		this.verdict.set(null);
		this.locked.set(false);
		this.setupRound();
		this.startRoundTimer();
	}

	submitMix(): void {
		if (this.submittedToMix()) return;
		this.submittedToMix.set(true);
		this.room.submitMixSegment(
			this.score() * this.basePoints,
			`Intrus : ${this.correctCount()}/${this.maxRounds()} intrus trouves.`,
		);
	}

	requestRestart(): void {
		if (!this.room.isHost()) return;
		this.room.restartGame("intrus");
	}

	restart(): void {
		this.shuffleRounds();
		clearTimeout(this.autoNextTimer);
		this.submittedToMix.set(false);
		this.index.set(0);
		this.score.set(0);
		this.correctCount.set(0);
		this.pickedIndex.set(null);
		this.verdict.set(null);
		this.locked.set(false);
		this.setupRound();
		this.startRoundTimer();
	}
}
