import { Injectable, signal } from "@angular/core";

const DISMISSED_KEY = "rift-party-supporter-offer-dismissed";

/**
 * Etat partage de la popup marketing "Rift Party Supporter", declenchable
 * depuis n'importe quelle page (ex: fin de Party Mix) sans avoir a importer
 * le composant modal partout - un seul <app-supporter-offer-modal> est monte
 * une fois dans AppComponent et reagit a ce service.
 */
@Injectable({ providedIn: "root" })
export class SupporterOfferService {
	private readonly _isOpen = signal(false);
	readonly isOpen = this._isOpen.asReadonly();

	/** Ne rouvre pas si l'utilisateur a deja ferme l'offre cette session (pas envie de la spammer a chaque fin de mix). */
	open(): void {
		if (sessionStorage.getItem(DISMISSED_KEY)) return;
		this._isOpen.set(true);
	}

	close(): void {
		this._isOpen.set(false);
		sessionStorage.setItem(DISMISSED_KEY, "true");
	}
}
