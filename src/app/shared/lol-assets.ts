export interface ChampionOption {
  id: string;
  name: string;
}

const CHAMPION_NAMES = [
  'Aatrox', 'Ahri', 'Akali', 'Akshan', 'Alistar', 'Ambessa', 'Amumu', 'Anivia', 'Annie', 'Aphelios', 'Ashe',
  'Aurelion Sol', 'Aurora', 'Azir', 'Bard', "Bel'Veth", 'Blitzcrank', 'Brand', 'Braum', 'Briar', 'Caitlyn',
  'Camille', 'Cassiopeia', "Cho'Gath", 'Corki', 'Darius', 'Diana', "Dr. Mundo", 'Draven', 'Ekko', 'Elise',
  'Evelynn', 'Ezreal', 'Fiddlesticks', 'Fiora', 'Fizz', 'Galio', 'Gangplank', 'Garen', 'Gnar', 'Gragas',
  'Graves', 'Gwen', 'Hecarim', 'Heimerdinger', 'Hwei', 'Illaoi', 'Irelia', 'Ivern', 'Janna', 'Jarvan IV',
  'Jax', 'Jayce', 'Jhin', 'Jinx', "K'Sante", "Kai'Sa", 'Kalista', 'Karma', 'Karthus', 'Kassadin',
  'Katarina', 'Kayle', 'Kayn', 'Kennen', "Kha'Zix", 'Kindred', 'Kled', "Kog'Maw", 'LeBlanc', 'Lee Sin',
  'Leona', 'Lillia', 'Lissandra', 'Lucian', 'Lulu', 'Lux', 'Malphite', 'Malzahar', 'Maokai', 'Master Yi',
  'Mel', 'Milio', 'Miss Fortune', 'Mordekaiser', 'Morgana', 'Naafiri', 'Nami', 'Nasus', 'Nautilus', 'Neeko',
  'Nidalee', 'Nilah', 'Nocturne', 'Nunu & Willump', 'Olaf', 'Orianna', 'Ornn', 'Pantheon', 'Poppy', 'Pyke',
  'Qiyana', 'Quinn', 'Rakan', 'Rammus', "Rek'Sai", 'Rell', 'Renata Glasc', 'Renekton', 'Rengar', 'Riven',
  'Rumble', 'Ryze', 'Samira', 'Sejuani', 'Senna', 'Seraphine', 'Sett', 'Shaco', 'Shen', 'Shyvana', 'Singed',
  'Sion', 'Sivir', 'Skarner', 'Smolder', 'Sona', 'Soraka', 'Swain', 'Sylas', 'Syndra', 'Tahm Kench',
  'Taliyah', 'Talon', 'Taric', 'Teemo', 'Thresh', 'Tristana', 'Trundle', 'Tryndamere', 'Twisted Fate',
  'Twitch', 'Udyr', 'Urgot', 'Varus', 'Vayne', 'Veigar', "Vel'Koz", 'Vex', 'Vi', 'Viego', 'Viktor',
  'Vladimir', 'Volibear', 'Warwick', 'Wukong', 'Xayah', 'Xerath', 'Xin Zhao', 'Yasuo', 'Yone', 'Yorick',
  'Yuumi', 'Zac', 'Zed', 'Zeri', 'Ziggs', 'Zilean', 'Zoe', 'Zyra'
];

const CHAMPION_ID_KEYS: Record<string, string> = {
  aatrox: 'Aatrox', ahri: 'Ahri', akali: 'Akali', amumu: 'Amumu', ashe: 'Ashe', azir: 'Azir', blitzcrank: 'Blitzcrank', braum: 'Braum', caitlyn: 'Caitlyn', camille: 'Camille', darius: 'Darius', diana: 'Diana', draven: 'Draven', ekko: 'Ekko', elise: 'Elise', ezreal: 'Ezreal', fiddlesticks: 'Fiddlesticks', fiora: 'Fiora', galio: 'Galio', garen: 'Garen', gragas: 'Gragas', graves: 'Graves', hecarim: 'Hecarim', irelia: 'Irelia', ivern: 'Ivern', janna: 'Janna', jarvan: 'JarvanIV', jax: 'Jax', jhin: 'Jhin', jinx: 'Jinx', kaisa: 'Kaisa', kalista: 'Kalista', katarina: 'Katarina', kayle: 'Kayle', kayn: 'Kayn', khazix: 'Khazix', kindred: 'Kindred', leblanc: 'Leblanc', 'lee-sin': 'LeeSin', leona: 'Leona', lissandra: 'Lissandra', lucian: 'Lucian', lulu: 'Lulu', lux: 'Lux', malphite: 'Malphite', morgana: 'Morgana', nami: 'Nami', nautilus: 'Nautilus', nocturne: 'Nocturne', orianna: 'Orianna', ornn: 'Ornn', pyke: 'Pyke', qiyana: 'Qiyana', rakan: 'Rakan', rammus: 'Rammus', renekton: 'Renekton', riven: 'Riven', samira: 'Samira', sejuani: 'Sejuani', senna: 'Senna', sett: 'Sett', shen: 'Shen', singed: 'Singed', soraka: 'Soraka', syndra: 'Syndra', taliyah: 'Taliyah', thresh: 'Thresh', tristana: 'Tristana', trundle: 'Trundle', twitch: 'Twitch', vayne: 'Vayne', veigar: 'Veigar', vi: 'Vi', viktor: 'Viktor', wukong: 'MonkeyKing', xayah: 'Xayah', xerath: 'Xerath', yasuo: 'Yasuo', yone: 'Yone', yuumi: 'Yuumi', zac: 'Zac', zed: 'Zed', zeri: 'Zeri', zyra: 'Zyra',
  aurelionsol: 'AurelionSol', belveth: 'Belveth', chogath: 'Chogath', drmundo: 'DrMundo', ksante: 'KSante', kogmaw: 'KogMaw', masteryi: 'MasterYi', missfortune: 'MissFortune', nunu: 'Nunu', reksai: 'RekSai', renata: 'Renata', tahmkench: 'TahmKench', twistedfate: 'TwistedFate', velkoz: 'Velkoz', xinzhao: 'XinZhao',
};

const CHAMPION_KEYS: Record<string, string> = {
  'Jarvan IV': 'JarvanIV',
  "Kai'Sa": 'Kaisa',
  "Kha'Zix": 'Khazix',
  'LeBlanc': 'Leblanc',
  'Lee Sin': 'LeeSin',
  'Wukong': 'MonkeyKing',
  'Nunu & Willump': 'Nunu',
  'Renata Glasc': 'Renata',
  'Ambessa': 'Ambessa',
  'Aurora': 'Aurora',
  'Mel': 'Mel',
  'Aurelion Sol': 'AurelionSol',
  "Cho'Gath": 'Chogath',
  "Dr. Mundo": 'DrMundo',
  "Vel'Koz": 'Velkoz',
  "Kog'Maw": 'KogMaw',
  "Rek'Sai": 'RekSai',
  "Bel'Veth": 'Belveth',
  "K'Sante": 'KSante',
  'Master Yi': 'MasterYi',
  'Tahm Kench': 'TahmKench',
  'Twisted Fate': 'TwistedFate',
  'Xin Zhao': 'XinZhao',
};

const ITEM_KEYS: Record<string, string> = {
  'Iceborn Gauntlet': '6662',
  'Sunfire': '3068',
  'Plated Steelcaps': '3047',
  'Moonstone': '6617',
  'Lucidity Boots': '3158',
  'Stridebreaker': '6631',
  'Sterak': '3053',
  'Ruby Crystal': '1028',
  'Kraken': '6672',
  'Guinsoo': '3124',
  'Berserker': '3006',
  'JakSho': '6665',
  'Frozen Heart': '3110',
  'Tabi': '3047',
  'Heartsteel': '3084',
  'Rabadon': '3089',
};

export function championKey(nameOrId?: string | null): string {
  const safe = (nameOrId ?? 'Yasuo').trim() || 'Yasuo';
  const fromId = CHAMPION_ID_KEYS?.[safe.toLowerCase()];
  if (fromId) return fromId;
  const fromName = CHAMPION_KEYS?.[safe];
  if (fromName) return fromName;
  return safe
    .replace(/&/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^([a-z])/, (m) => m.toUpperCase());
}

/**
 * Sbires (voir backend/src/draft/data/champions.data.ts::SBIRE_CHAMPIONS) : ce
 * sont de faux champions (id `sbire-<role>`), inconnus de Data Dragon. Leurs
 * visuels sont des images locales dans `src/assets/sbires/<role>.png`, jamais
 * la CDN Riot. `role` correspond au suffixe de l'id : sbire-top -> top.png.
 */
const SBIRE_ID_PREFIX = 'sbire-';

function sbireImageUrl(nameOrId?: string | null): string | null {
  const id = (nameOrId ?? '').toLowerCase();
  if (!id.startsWith(SBIRE_ID_PREFIX)) return null;
  const role = id.slice(SBIRE_ID_PREFIX.length);
  return `/assets/sbires/${role}.png`;
}

export function championSquareUrl(nameOrId?: string | null): string {
  return sbireImageUrl(nameOrId) ?? `https://ddragon.leagueoflegends.com/cdn/15.24.1/img/champion/${championKey(nameOrId)}.png`;
}

export function championSplashUrl(nameOrId?: string | null): string {
  return sbireImageUrl(nameOrId) ?? `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championKey(nameOrId)}_0.jpg`;
}

/**
 * Portrait "loading screen" (308x560) : contrairement au splash art (bannière
 * large, cadrage très variable selon le champion), ce visuel est toujours
 * cadré de façon cohérente sur le personnage. Beaucoup plus fiable pour un
 * conteneur portrait/carré qui doit rester centré sur le champion.
 */
export function championLoadingUrl(nameOrId?: string | null): string {
  return sbireImageUrl(nameOrId) ?? `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${championKey(nameOrId)}_0.jpg`;
}

export function itemIconUrl(item?: string | null): string {
  return `https://ddragon.leagueoflegends.com/cdn/15.24.1/img/item/${ITEM_KEYS[item ?? ''] ?? '1028'}.png`;
}

export function normalizeChampionName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const CHAMPION_OPTIONS: ChampionOption[] = CHAMPION_NAMES.map((name) => ({
  id: championKey(name),
  name,
}));
