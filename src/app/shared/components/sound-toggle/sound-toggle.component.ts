import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AudioService } from '../../../core/services/audio.service';

/** Bouton flottant mute/unmute global (SFX + musique). */
@Component({
  selector: 'app-sound-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="sound-toggle"
      [class.muted]="audio.muted()"
      (click)="audio.toggleMute()"
      [title]="audio.muted() ? 'Activer le son' : 'Couper le son'"
    >
      @if (audio.muted()) {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" /><line x1="22" x2="16" y1="9" y2="15" /><line x1="16" x2="22" y1="9" y2="15" />
        </svg>
      } @else {
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      }
    </button>
  `,
  styles: `
    .sound-toggle {
      position: fixed;
      right: 1.1rem;
      bottom: 1.1rem;
      z-index: 300;
      width: 46px;
      height: 46px;
      display: grid;
      place-items: center;
      border-radius: 14px;
      border: 1px solid rgba(200, 170, 110, 0.35);
      background: rgba(1, 10, 19, 0.82);
      backdrop-filter: blur(10px);
      color: var(--gold);
      cursor: pointer;
      transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, color 0.18s ease;
    }
    .sound-toggle svg { width: 21px; height: 21px; }
    .sound-toggle:hover {
      transform: translateY(-2px);
      border-color: var(--gold);
      box-shadow: 0 0 18px rgba(200, 170, 110, 0.25);
      color: var(--gold-bright);
    }
    .sound-toggle.muted { color: var(--text-muted); border-color: rgba(255, 255, 255, 0.14); }
  `,
})
export class SoundToggleComponent {
  protected readonly audio = inject(AudioService);
}
