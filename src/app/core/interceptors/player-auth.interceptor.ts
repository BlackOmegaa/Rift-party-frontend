import { HttpInterceptorFn } from "@angular/common/http";
import { getPlayerToken } from "../services/player-auth.service";

/**
 * Ajoute automatiquement `Authorization: Bearer <token>` sur les requetes
 * vers /player-auth et /billing. Lit le token via la fonction pure
 * `getPlayerToken()` (localStorage direct) plutot que d'injecter
 * PlayerAuthService : ce service declenche lui-meme un appel HTTP dans son
 * propre constructeur (refreshProfile au demarrage si un token existe deja),
 * qui repasse par CET intercepteur - l'injecter ici recreerait le service en
 * boucle pendant sa propre construction (NG0200) au tout premier chargement
 * de page quand un token est deja present en localStorage.
 */
export const playerAuthInterceptor: HttpInterceptorFn = (req, next) => {
	if (!req.url.includes("/player-auth/") && !req.url.includes("/billing/")) return next(req);
	const token = getPlayerToken();
	if (!token) return next(req);
	return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
