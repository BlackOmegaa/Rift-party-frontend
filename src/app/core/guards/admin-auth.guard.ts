import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AdminAuthService } from "../services/admin-auth.service";

export const adminAuthGuard: CanActivateFn = () => {
	const authService = inject(AdminAuthService);
	if (authService.getToken()) return true;
	const router = inject(Router);
	return router.createUrlTree(["/rp-console"]);
};
