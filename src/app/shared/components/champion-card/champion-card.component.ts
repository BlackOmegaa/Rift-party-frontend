import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Champion } from '../../../core/models/draft.model';

@Component({
  selector: 'app-champion-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './champion-card.component.html',
  styleUrl: './champion-card.component.scss',
})
export class ChampionCardComponent {
  champion = input.required<Champion>();
  selected = input<boolean>(false);
  disabled = input<boolean>(false);
  toggle = output<Champion>();

  initials(): string {
    return this.champion().name.slice(0, 2).toUpperCase();
  }
}
