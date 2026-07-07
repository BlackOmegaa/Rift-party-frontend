import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { PlayerAuthService } from "../services/player-auth.service";

export const playerAuthGuard: CanActivateFn = () => {
	const authService = inject(PlayerAuthService);
	if (authService.getToken()) return true;
	const router = inject(Router);
	return router.createUrlTree(["/login"]);
};
