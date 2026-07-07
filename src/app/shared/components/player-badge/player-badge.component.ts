import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Player } from '../../../core/models/player.model';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-player-badge',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './player-badge.component.html',
  styleUrl: './player-badge.component.scss',
})
export class PlayerBadgeComponent {
  player = input.required<Player>();
  isMe = input<boolean>(false);
}
