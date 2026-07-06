import { Injectable, inject } from '@angular/core';
import { RoomService } from './room.service';

const DEFAULT_ROUNDS: Record<string, number> = {
  'guess-champion': 10,
  'fusion-champions': 10,
  'turret-tank': 10,
  'whos-inting': 10,
  'tiktok-ranking': 7,
  'draft-battle': 1,
  'undercover-champion': 1,
  'intrus': 10,
  'vote-party': 5,
};

const DEFAULT_ROUND_TIME_SEC = 35;

/**
 * Reglages de la room : portes par le serveur (Room.settings), l'host est la
 * seule source d'autorite. Plus de localStorage : chaque joueur voit la
 * meme valeur, synchronisee via ROOM_EVENTS.STATE.
 */
@Injectable({ providedIn: 'root' })
export class GameSettingsService {
  private readonly room = inject(RoomService);

  roundsFor(gameId: string): number {
    return this.room.room()?.settings.roundsByGame[gameId] ?? DEFAULT_ROUNDS[gameId] ?? 10;
  }

  roundTimeSec(): number {
    return this.room.room()?.settings.roundTimeSec ?? DEFAULT_ROUND_TIME_SEC;
  }

  setRounds(gameId: string, rounds: number): void {
    this.room.updateSettings({ roundsByGame: { [gameId]: rounds } });
  }

  setRoundTime(seconds: number): void {
    this.room.updateSettings({ roundTimeSec: seconds });
  }

  loldleWordLength(): number | null {
    return this.room.room()?.settings.loldleWordLength ?? null;
  }

  setLoldleWordLength(length: number | null): void {
    this.room.updateSettings({ loldleWordLength: length });
  }
}
