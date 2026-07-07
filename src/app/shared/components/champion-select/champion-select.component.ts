import { ChangeDetectionStrategy, Component, ElementRef, HostListener, input, output, signal } from '@angular/core';
import { ChampionOption, championSquareUrl } from '../../lol-assets';

@Component({
  selector: 'app-champion-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './champion-select.component.html',
  styleUrl: './champion-select.component.scss',
})
export class ChampionSelectComponent {
  options = input<ChampionOption[]>([]);
  value = input('');
  placeholder = input('Choisis un champion...');
  disabled = input(false);
  valueChange = output<string>();
  open = signal(false);
  /** Ouvre le menu vers le haut quand l'input est proche du bas de l'ecran (barres d'action des scenes cinematiques). */
  dropUp = signal(false);

  constructor(private readonly host: ElementRef<HTMLElement>) {}

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  openMenu(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    // ~360px = hauteur max du menu + marge ; en dessous, on flippe vers le haut.
    this.dropUp.set(window.innerHeight - rect.bottom < 360);
    this.open.set(true);
  }

  filtered(): ChampionOption[] {
    const query = this.value().trim().toLowerCase();
    const source = this.options();
    const ranked = query
      ? source.filter((champ) => champ.name.toLowerCase().includes(query) || champ.id.toLowerCase().includes(query))
      : source;
    return ranked.slice(0, 5);
  }

  icon(id: string): string { return championSquareUrl(id); }

  onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
    this.openMenu();
  }

  select(champ: ChampionOption): void {
    this.valueChange.emit(champ.name);
    this.open.set(false);
  }
}
