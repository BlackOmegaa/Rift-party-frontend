import { Injectable, computed, signal } from '@angular/core';
import { SocketService } from './socket.service';
import { RoomService } from './room.service';

export interface MixRuntimeContext {
  active: boolean;
  gameId: string | null;
  roundSize: number;
  mixIndex: number;
  mixTotal: number;
}

@Injectable({ providedIn: 'root' })
export class MixRuntimeService {
  private readonly _eventContext = signal<MixRuntimeContext>({ active: false, gameId: null, roundSize: 10, mixIndex: 0, mixTotal: 0 });

  readonly context = computed<MixRuntimeContext>(() => {
    const room = this.room.room();
    const mix = room?.activeMix;
    if (mix?.status === 'running') {
      return {
        active: true,
        gameId: room?.currentGameId ?? mix.currentGameId,
        roundSize: mix.currentRoundSize || 1,
        mixIndex: mix.cursor,
        mixTotal: mix.total,
      };
    }
    return this._eventContext();
  });

  readonly active = computed(() => this.context().active);
  readonly roundSize = computed(() => this.context().active ? this.context().roundSize : 10);
  readonly mixIndex = computed(() => this.context().mixIndex);
  readonly mixTotal = computed(() => this.context().mixTotal);
  readonly progress = signal<{
    ready: number;
    total: number;
    scores?: { playerId: string; pseudo: string; points: number }[];
  } | null>(null);

  constructor(private readonly socket: SocketService, private readonly room: RoomService) {
    this.socket.on<{ ready: number; total: number; scores?: { playerId: string; pseudo: string; points: number }[] }>(
      'party:segment-progress',
      (payload) => this.progress.set(payload),
    );
    this.socket.on<{ gameId: string; mix?: Partial<MixRuntimeContext> }>('room:game-started', (payload) => {
      if (payload.mix?.active) {
        this.progress.set(null);
        this._eventContext.set({
          active: true,
          gameId: payload.gameId,
          roundSize: payload.mix.roundSize ?? 1,
          mixIndex: payload.mix.mixIndex ?? 1,
          mixTotal: payload.mix.mixTotal ?? 15,
        });
      } else {
        this.progress.set(null);
        this._eventContext.set({ active: false, gameId: payload.gameId, roundSize: 10, mixIndex: 0, mixTotal: 0 });
      }
    });
    this.socket.on<{ gameId: string }>('room:game-restarted', () => this.progress.set(null));
  }
}
