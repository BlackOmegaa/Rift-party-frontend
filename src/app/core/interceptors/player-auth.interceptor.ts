import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { PlayerAuthService } from "../services/player-auth.service";

/** Ajoute automatiquement `Authorization: Bearer <token>` sur les requetes vers /player-auth et /billing. */
export const playerAuthInterceptor: HttpInterceptorFn = (req, next) => {
	if (!req.url.includes("/player-auth/") && !req.url.includes("/billing/")) return next(req);
	const token = inject(PlayerAuthService).getToken();
	if (!token) return next(req);
	return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
