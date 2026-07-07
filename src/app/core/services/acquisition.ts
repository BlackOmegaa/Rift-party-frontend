/**
 * Source d'acquisition, calculee une fois par chargement de page (fonction pure,
 * meme esprit que anon-id.ts). Envoyee a chaque connexion socket ; le backend ne
 * la retient qu'a la toute premiere visite d'un anonId (first-touch attribution,
 * voir PersistenceService.upsertVisitor) donc pas besoin de la persister ici.
 *
 * Deux mecanismes, par ordre de priorite :
 * 1. `?src=xxx` dans l'URL : controle total quand on partage un lien (ex.
 *    annonce Discord avec `?src=discord`, bio TikTok avec `?src=tiktok`).
 * 2. `document.referrer` : bucket les domaines connus, sinon "direct" si vide.
 */
const KNOWN_REFERRERS: Record<string, string> = {
	"reddit.com": "reddit",
	"discord.com": "discord",
	"discordapp.com": "discord",
	"tiktok.com": "tiktok",
	"twitter.com": "twitter",
	"x.com": "twitter",
	"instagram.com": "instagram",
	"youtube.com": "youtube",
	"google.com": "google",
};

export function getAcquisitionSource(): string | null {
	try {
		const fromQuery = new URLSearchParams(window.location.search).get("src");
		if (fromQuery) return fromQuery.trim().toLowerCase().slice(0, 40);

		const referrer = document.referrer;
		if (!referrer) return "direct";

		const host = new URL(referrer).hostname.replace(/^www\./, "");
		for (const [domain, label] of Object.entries(KNOWN_REFERRERS)) {
			if (host === domain || host.endsWith(`.${domain}`)) return label;
		}
		return "autre";
	} catch {
		return null;
	}
}
