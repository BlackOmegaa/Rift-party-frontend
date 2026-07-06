const STORAGE_KEY = "rift-party-anon-id";

/**
 * Identifiant anonyme persistant (localStorage), genere une seule fois par
 * navigateur. Sert uniquement aux stats cote admin (connexions, retention) -
 * aucun compte joueur, aucune donnee personnelle. Fonction pure (pas un
 * service Angular) car SocketService l'utilise a l'initialisation de son
 * champ `io(...)`, avant que l'injection de dependances ne soit resolue.
 */
export function getOrCreateAnonId(): string {
	let id = localStorage.getItem(STORAGE_KEY);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(STORAGE_KEY, id);
	}
	return id;
}
