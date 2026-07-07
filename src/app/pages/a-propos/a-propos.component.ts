import { AfterViewInit, ChangeDetectionStrategy, Component, DestroyRef, inject } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute, RouterLink } from "@angular/router";
import { IconComponent } from "../../shared/components/icon/icon.component";

/**
 * Page statique "À propos / Légal" : présentation du site, mentions légales,
 * politique de confidentialité, CGV de l'abonnement Supporter et contact.
 * Chaque section porte un id pour être ciblée par ancre (#mentions-legales...).
 */
@Component({
	selector: "app-a-propos",
	standalone: true,
	imports: [RouterLink, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./a-propos.component.html",
	styleUrl: "./a-propos.component.scss",
})
export class AProposComponent implements AfterViewInit {
	private readonly route = inject(ActivatedRoute);
	private readonly destroyRef = inject(DestroyRef);

	ngAfterViewInit(): void {
		// Le router n'a pas d'anchorScrolling global : on gère nous-mêmes le
		// défilement vers l'ancre, aussi bien à l'arrivée sur la page (lien
		// externe du type /a-propos#confidentialite) qu'en cas de changement
		// de fragment pendant qu'on est déjà sur la page.
		this.route.fragment.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fragment) => {
			if (!fragment) return;
			setTimeout(() => {
				document.getElementById(fragment)?.scrollIntoView({ behavior: "smooth", block: "start" });
			});
		});
	}
}
