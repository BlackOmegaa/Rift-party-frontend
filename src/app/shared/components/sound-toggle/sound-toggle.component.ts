import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';
import { AudioService } from '../../../core/services/audio.service';

/**
 * Controle audio flottant : clic = ouvre un panneau avec sliders musique/effets
 * + bouton mute. Les reglages viennent d'AudioService (persistes en localStorage).
 */
@Component({
  selector: 'app-sound-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (panelOpen()) {
      <div class="sound-panel">
        <label>
          <span class="row-head">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            Musique
          </span>
          <input
            type="range"
            min="0"
            max="100"
            [value]="audio.musicVolume() * 100"
            (input)="onMusicVolume($event)"
          />
        </label>
        <label>
          <span class="row-head">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5Z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
            Effets
          </span>
          <input
            type="range"
            min="0"
            max="100"
            [value]="audio.sfxVolume() * 100"
            (input)="onSfxVolume($event)"
            (change)="previewSfx()"
          />
        </label>
        <button class="mute-row" [class.muted]="audio.muted()" (click)="audio.toggleMute()">
          {{ audio.muted() ? 'Réactiver le son' : 'Tout couper' }}
        </button>
      </div>
    }
    <button
      class="sound-toggle"
      [class.muted]="audio.muted()"
      [class.active]="panelOpen()"
      (click)="panelOpen.set(!panelOpen())"
      title="Réglages du son"
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
    :host {
      position: fixed;
      right: 1.1rem;
      bottom: 1.1rem;
      z-index: 300;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.6rem;
    }
    .sound-toggle {
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
    .sound-toggle:hover,
    .sound-toggle.active {
      transform: translateY(-2px);
      border-color: var(--gold);
      box-shadow: 0 0 18px rgba(200, 170, 110, 0.25);
      color: var(--gold-bright);
    }
    .sound-toggle.muted { color: var(--text-muted); border-color: rgba(255, 255, 255, 0.14); }

    .sound-panel {
      width: 220px;
      padding: 0.9rem;
      border-radius: 18px;
      border: 1px solid rgba(200, 170, 110, 0.3);
      background: rgba(1, 10, 19, 0.92);
      backdrop-filter: blur(14px);
      box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      animation: panel-in 0.18s ease-out both;
    }
    .sound-panel label { display: flex; flex-direction: column; gap: 0.4rem; }
    .row-head {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.7rem;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--gold);
    }
    .row-head svg { width: 15px; height: 15px; }
    .sound-panel input[type='range'] {
      width: 100%;
      accent-color: #c8aa6e;
      cursor: pointer;
    }
    .mute-row {
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 11px;
      background: rgba(255, 255, 255, 0.04);
      color: var(--text-secondary);
      font-weight: 900;
      font-size: 0.72rem;
      padding: 0.5rem;
      cursor: pointer;
      transition: 0.18s;
    }
    .mute-row:hover { color: var(--gold-bright); border-color: rgba(200, 170, 110, 0.45); }
    .mute-row.muted { color: #ff8a9a; border-color: rgba(193, 60, 77, 0.4); background: rgba(193, 60, 77, 0.08); }
    @keyframes panel-in {
      from { opacity: 0; transform: translateY(8px) scale(0.96); }
      to { opacity: 1; transform: none; }
    }
  `,
})
export class SoundToggleComponent {
  protected readonly audio = inject(AudioService);
  protected readonly panelOpen = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.panelOpen.set(false);
  }

  protected onMusicVolume(event: Event): void {
    this.audio.setMusicVolume(Number((event.target as HTMLInputElement).value) / 100);
  }

  protected onSfxVolume(event: Event): void {
    this.audio.setSfxVolume(Number((event.target as HTMLInputElement).value) / 100);
  }

  /** Petit son temoin au relachement du slider effets, pour calibrer a l'oreille. */
  protected previewSfx(): void {
    this.audio.play('ui-click');
  }
}
