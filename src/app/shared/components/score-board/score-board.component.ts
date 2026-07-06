import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Player } from '../../../core/models/player.model';

@Component({
  selector: 'app-score-board',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './score-board.component.html',
  styleUrl: './score-board.component.scss',
})
export class ScoreBoardComponent {
  players = input.required<Player[]>();
}
