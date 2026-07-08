// Données du mini-jeu Fusion Champions — image IA de 2 champions fusionnés,
// le joueur devine les deux. Une image par fusion dans src/assets/fusions/
// (nom : fusion-<id>.png). `available` passe à true une fois l'image déposée :
// le mode ne propose QUE les fusions disponibles. Voir assets/fusions/README.md.
export interface Fusion {
	id: string;
	a: string;
	b: string;
	/** Nom-valise de la fusion (ex. "Ahryn"), révélé après la réponse. */
	name: string;
	/** Petite phrase descriptive affichée à la révélation. */
	phrase: string;
	/** Vrai si l'image existe dans assets/fusions/ — sinon la fusion est ignorée. */
	available: boolean;
}

export const FUSIONS: Fusion[] = [
	{ id: "ahri-evelynn", a: "Ahri", b: "Evelynn", name: "Ahryn", phrase: "Charme envoûtant et lames de l'ombre : elle séduit d'abord, elle frappe ensuite.", available: true },
	{ id: "yasuo-pyke", a: "Yasuo", b: "Pyke", name: "Yaske", phrase: "La lame du vent et le harpon des noyés : il tranche, puis s'efface sous la surface.", available: false },
	{ id: "zed-shen", a: "Zed", b: "Shen", name: "Zhen", phrase: "Deux ninjas du Kinkou en un seul : l'ordre et la trahison sur la même lame.", available: false },
	{ id: "lux-morgana", a: "Lux", b: "Morgana", name: "Luxgana", phrase: "Une aile de lumière, une aile déchue : clarté et corruption dans un même sort.", available: true },
	{ id: "jinx-zeri", a: "Jinx", b: "Zeri", name: "Jineri", phrase: "Zaun sous haute tension : gâchette folle et décharges électriques.", available: false },
	{ id: "draven-darius", a: "Draven", b: "Darius", name: "Dravarius", phrase: "Les frères de Noxus réunis : la hache qui tournoie, la lame qui exécute.", available: false },
	{ id: "sett-braum", a: "Sett", b: "Braum", name: "Settaum", phrase: "Le Boss au grand cœur : poings de fer et bouclier incassable.", available: true },
	{ id: "katarina-akali", a: "Katarina", b: "Akali", name: "Katali", phrase: "Danse de lames et voile de fumée : on ne la voit jamais venir deux fois.", available: false },
	{ id: "garen-fiora", a: "Garen", b: "Fiora", name: "Fioren", phrase: "L'honneur de Demacia au fil de l'épée : justice tranchante, duel parfait.", available: false },
	{ id: "malphite-rammus", a: "Malphite", b: "Rammus", name: "Malmus", phrase: "Un rocher roulant indestructible. « Ok. » Et il fonce.", available: false },
	{ id: "teemo-veigar", a: "Teemo", b: "Veigar", name: "Veemo", phrase: "Minuscule, adorable, et parfaitement diabolique.", available: false },
	{ id: "ashe-sejuani", a: "Ashe", b: "Sejuani", name: "Ashuani", phrase: "Les reines du Freljord : flèche de givre et fureur du sanglier.", available: false },
	{ id: "thresh-hecarim", a: "Thresh", b: "Hecarim", name: "Threcarim", phrase: "Un cavalier spectral qui traîne ses chaînes à travers les âmes.", available: false },
	{ id: "riven-irelia", a: "Riven", b: "Irelia", name: "Rivelia", phrase: "Lames dansantes de Ionia : l'exilée brisée et la volonté d'acier.", available: false },
	{ id: "aatrox-mordekaiser", a: "Aatrox", b: "Mordekaiser", name: "Aatrokaiser", phrase: "Épée démoniaque et royaume des morts : la guerre incarnée.", available: false },
	{ id: "vi-jayce", a: "Vi", b: "Jayce", name: "Vayce", phrase: "Piltover cogne fort : gantelets hextech et marteau électrique.", available: false },
	{ id: "kaisa-vayne", a: "Kai'Sa", b: "Vayne", name: "Kaisayne", phrase: "Chasseresses du néant et de la nuit : chaque carreau fait mouche.", available: false },
	{ id: "nasus-renekton", a: "Nasus", b: "Renekton", name: "Renekus", phrase: "Les frères gardiens de Shurima : le temps contre la rage.", available: false },
	{ id: "leona-diana", a: "Leona", b: "Diana", name: "Leodiana", phrase: "Le soleil et la lune enfin réunis : bouclier radieux, croissant d'argent.", available: false },
	{ id: "sona-seraphine", a: "Sona", b: "Seraphine", name: "Soraphine", phrase: "La mélodie qui envoûte la Faille : deux voix, une seule scène.", available: false },
	{ id: "ekko-zilean", a: "Ekko", b: "Zilean", name: "Ekklean", phrase: "Maîtres du temps : remonte l'horloge, refais le monde.", available: false },
	{ id: "camille-viktor", a: "Camille", b: "Viktor", name: "Camiktor", phrase: "Précision hextech et évolution glorieuse : l'acier parfait.", available: false },
	{ id: "yone-kayn", a: "Yone", b: "Kayn", name: "Yonayn", phrase: "Une faux, une lame spectrale : il marche entre les vivants et les morts.", available: false },
	{ id: "kindred-karthus", a: "Kindred", b: "Karthus", name: "Karthred", phrase: "La mort en personne : le chant funèbre et l'ultime chasse.", available: false },
	{ id: "jhin-senna", a: "Jhin", b: "Senna", name: "Jhenna", phrase: "L'art macabre et la lumière retrouvée : chaque balle est une œuvre.", available: false },
	{ id: "leesin-udyr", a: "Lee Sin", b: "Udyr", name: "Leedyr", phrase: "L'esprit du poing et des bêtes : le moine aveugle déchaîné.", available: false },
	{ id: "volibear-ornn", a: "Volibear", b: "Ornn", name: "Volinn", phrase: "Les demi-dieux du Freljord : la tempête gronde, la forge rugit.", available: false },
	{ id: "chogath-kogmaw", a: "Cho'Gath", b: "Kog'Maw", name: "Chogmaw", phrase: "Les horreurs du Néant : elles grandissent, puis elles dévorent.", available: false },
	{ id: "elise-cassiopeia", a: "Elise", b: "Cassiopeia", name: "Elissiopeia", phrase: "Venin et soie : une étreinte mortelle en écailles.", available: false },
	{ id: "twistedfate-graves", a: "Twisted Fate", b: "Graves", name: "Gravefate", phrase: "Le duo de Bilgewater : cartes truquées et poudre à canon.", available: false },
	{ id: "rengar-khazix", a: "Rengar", b: "Kha'Zix", name: "Rengazix", phrase: "La chasse éternelle : le prédateur traque l'évolution.", available: false },
	{ id: "warwick-twitch", a: "Warwick", b: "Twitch", name: "Twitchwick", phrase: "Les traqueurs de Zaun : la meute au flair chimique.", available: false },
	{ id: "anivia-lissandra", a: "Anivia", b: "Lissandra", name: "Anivandra", phrase: "Le givre éternel : le phénix de glace et la sorcière noire.", available: false },
	{ id: "karma-soraka", a: "Karma", b: "Soraka", name: "Karaka", phrase: "Bienveillance céleste : équilibre et étoiles guérisseuses.", available: false },
	{ id: "xinzhao-jarvaniv", a: "Xin Zhao", b: "Jarvan IV", name: "Xinvan", phrase: "La lance de Demacia : loyauté sans faille, charge héroïque.", available: false },
	{ id: "vladimir-swain", a: "Vladimir", b: "Swain", name: "Vladwain", phrase: "L'ascension de Noxus : le sang et les corbeaux au service du pouvoir.", available: false },
	{ id: "viego-kalista", a: "Viego", b: "Kalista", name: "Viegasta", phrase: "Le roi brisé et la lance de vengeance : la Ruine réunie.", available: false },
	{ id: "neeko-zoe", a: "Neeko", b: "Zoe", name: "Neekozoe", phrase: "Espièglerie et métamorphose : le cosmos joue des tours.", available: false },
	{ id: "illaoi-fizz", a: "Illaoi", b: "Fizz", name: "Illafizz", phrase: "Les enfants des profondeurs : le kraken et le farfadet des marées.", available: false },
	{ id: "gnar-gragas", a: "Gnar", b: "Gragas", name: "Gnaragas", phrase: "Le chaos joyeux : petit yordle furieux, gros tonneau explosif.", available: false },
	{ id: "poppy-kled", a: "Poppy", b: "Kled", name: "Poppled", phrase: "Deux yordles têtus : le marteau du devoir et la charge grognon.", available: false },
	{ id: "samira-missfortune", a: "Samira", b: "Miss Fortune", name: "Samfortune", phrase: "Style noxien et vengeance de Bilgewater : le combo à bout portant.", available: false },
	{ id: "tahmkench-bard", a: "Tahm Kench", b: "Bard", name: "Tahmbard", phrase: "Vagabonds cosmiques : un carillon d'un côté, une gueule affamée de l'autre.", available: false },
	{ id: "rakan-xayah", a: "Rakan", b: "Xayah", name: "Raxayah", phrase: "Les amants Vastaya : plumes rebelles et charme de scène.", available: false },
	{ id: "sylas-sion", a: "Sylas", b: "Sion", name: "Sylion", phrase: "La révolte enchaînée : chaînes brisées et colosse indestructible.", available: false },
	{ id: "nami-nautilus", a: "Nami", b: "Nautilus", name: "Namilus", phrase: "Les gardiens des abysses : la marée monte, l'ancre tombe.", available: false },
	{ id: "olaf-tryndamere", a: "Olaf", b: "Tryndamere", name: "Olafmere", phrase: "Fureur du Freljord : deux berserkers qui refusent de tomber.", available: false },
	{ id: "caitlyn-jinx", a: "Caitlyn", b: "Jinx", name: "Caitjinx", phrase: "Le chat et la souris de Piltover : le fusil de précision contre le chaos.", available: false },
	{ id: "yorick-fiddlesticks", a: "Yorick", b: "Fiddlesticks", name: "Yoricksticks", phrase: "L'effroi incarné : le fossoyeur et l'épouvantail des cauchemars.", available: false },
	{ id: "kayle-morgana", a: "Kayle", b: "Morgana", name: "Kaylgana", phrase: "Les sœurs déchirées : l'aile radieuse et l'aile maudite.", available: false },
];
