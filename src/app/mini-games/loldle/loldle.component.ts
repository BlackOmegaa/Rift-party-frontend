import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RoomService } from '../../core/services/room.service';
import { MixRuntimeService } from '../../core/services/mix-runtime.service';
import { LoldleService } from '../../core/services/loldle.service';
import { ChampionSelectComponent } from '../../shared/components/champion-select/champion-select.component';
import { CHAMPION_OPTIONS, championLoadingUrl } from '../../shared/lol-assets';
import { LoldleGuessRow, LoldleLetterState } from '../../core/models/loldle.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** Ne garde que les lettres, en majuscules : aligne l'affichage des cases avec le feedback du serveur. */
function lettersOf(name: string): string[] {
  return name.toUpperCase().replace(/[^A-Z]/g, '').split('');
}

@Component({
  selector: 'app-loldle',
  standalone: true,
  imports: [FormsModule, ChampionSelectComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loldle.component.html',
  styleUrl: './loldle.component.scss',
})
export class LoldleComponent {
  protected guessInput = '';
  protected readonly submittedToMix = signal(false);
  private readonly now = signal(Date.now());

  protected readonly championOptions = CHAMPION_OPTIONS;

  protected readonly filteredChampionOptions = computed(() => {
    const len = this.loldle.wordLength();
    if (!len) return this.championOptions;
    return this.championOptions.filter((c) => lettersOf(c.name).length === len);
  });

  protected readonly remainingSeconds = computed(() => {
    const deadline = this.loldle.phaseDeadline();
    if (!deadline) return 0;
    return Math.max(0, Math.ceil((deadline - this.now()) / 1000));
  });

  protected readonly blankRowsCount = computed(() =>
    Math.max(0, this.loldle.maxGuesses() - this.loldle.myRows().length),
  );

  protected readonly scoreRows = computed(() => {
    const results = this.loldle.results();
    if (!results) return [];
    return [...results.rows].sort((a, b) => b.points - a.points);
  });

  /**
   * Statut courant de chaque AUTRE joueur (moi = deja visible via ma propre
   * grille) : derive du feed (liste d'evenements "essai N") en ne gardant que
   * le dernier essai connu par joueur. Remplace l'ancien "fil de la manche"
   * (log brut qui defilait tout en bas, hors ecran) par un message clair par
   * joueur, affichable dans les marges gauche/droite de la grille.
   */
  protected readonly otherPlayersStatus = computed(() => {
    const myId = this.room.myId();
    const lastByPlayer = new Map<string, { attemptNumber: number; solved: boolean }>();
    for (const entry of this.loldle.feed()) {
      const existing = lastByPlayer.get(entry.playerId);
      if (!existing || entry.attemptNumber > existing.attemptNumber) {
        lastByPlayer.set(entry.playerId, { attemptNumber: entry.attemptNumber, solved: entry.solved });
      }
    }
    const maxGuesses = this.loldle.maxGuesses();
    return this.room
      .players()
      .filter((p) => p.id !== myId)
      .map((p) => {
        const last = lastByPlayer.get(p.id);
        const failed = !!last && !last.solved && last.attemptNumber >= maxGuesses;
        const solved = !!last?.solved;
        const message = solved
          ? `A trouvé en ${last!.attemptNumber} essai${last!.attemptNumber > 1 ? 's' : ''} !`
          : failed
            ? "N'a pas trouvé"
            : last
              ? `Essai ${last.attemptNumber}/${maxGuesses}`
              : "N'a pas encore commencé";
        return { playerId: p.id, pseudo: p.pseudo, solved, failed, message };
      });
  });


  constructor(
    protected readonly room: RoomService,
    protected readonly mix: MixRuntimeService,
    protected readonly loldle: LoldleService,
  ) {
    const ticker = setInterval(() => this.now.set(Date.now()), 250);
    inject(DestroyRef).onDestroy(() => clearInterval(ticker));
    // Toujours se resynchroniser au montage : les events one-shot (START,
    // GUESS_RESULT...) peuvent avoir ete emis avant que ce composant n'existe.
    this.loldle.requestState();
    effect(() => {
      if (this.loldle.results()) this.submitMix();
    });
  }

  cellsFor(row: LoldleGuessRow): { letter: string; state: LoldleLetterState }[] {
    const letters = lettersOf(row.name);
    return row.feedback.map((state, i) => ({ letter: letters[i] ?? '', state }));
  }

  blankCells(): number[] {
    return Array.from({ length: this.loldle.wordLength() || 5 }, (_, i) => i);
  }

  blankRows(): number[] {
    return Array.from({ length: this.blankRowsCount() }, (_, i) => i);
  }

  portraitUrl(champion: string): string {
    return championLoadingUrl(champion);
  }

  submitGuess(): void {
    const name = this.guessInput.trim();
    if (!name || this.loldle.myDone()) return;
    this.loldle.submitGuess(name);
    this.guessInput = '';
  }

  private submitMix(): void {
    if (!this.mix.active() || this.submittedToMix()) return;
    this.submittedToMix.set(true);
    const results = this.loldle.results();
    if (!results) return;
    const points = results.scores[this.room.myId() ?? ''] ?? 0;
    this.room.submitMixSegment(points, results.summary);
  }
}
