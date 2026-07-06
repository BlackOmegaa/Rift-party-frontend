import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { DraftResult, MatchScenario, ScenarioPhase } from "../../../core/models/draft.model";
import { Player } from "../../../core/models/player.model";
import { championSquareUrl } from "../../../shared/lol-assets";
import { IconComponent } from "../../../shared/components/icon/icon.component";

@Component({
	selector: "app-draft-result",
	standalone: true,
	imports: [IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./draft-result.component.html",
	styleUrl: "./draft-result.component.scss",
})
export class DraftResultComponent {
	result = input.required<DraftResult>();
	players = input.required<Player[]>();

	icon(id: string): string {
		return championSquareUrl(id);
	}

	pseudoOf(playerId: string): string {
		return this.players().find((p) => p.id === playerId)?.pseudo ?? "Joueur";
	}

	/** 1-2 moments-cles qui expliquent l'issue, sans jamais afficher les points bruts du moteur de score. */
	highlights(scenario: MatchScenario): ScenarioPhase[] {
		const decisive = scenario.phases.filter(
			(p) => p.favors === scenario.winnerSide && (p.kind === "teamfight" || p.kind === "objective"),
		);
		const pool = decisive.length
			? decisive
			: scenario.phases.filter((p) => p.favors === scenario.winnerSide);
		return pool.slice(-2);
	}
}
