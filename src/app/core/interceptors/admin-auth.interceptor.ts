import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AdminAuthService } from "../services/admin-auth.service";

/** Ajoute automatiquement `Authorization: Bearer <token>` sur les requetes vers /admin. */
export const adminAuthInterceptor: HttpInterceptorFn = (req, next) => {
	if (!req.url.includes("/admin/") && !req.url.endsWith("/admin")) return next(req);
	const token = inject(AdminAuthService).getToken();
	if (!token) return next(req);
	return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
