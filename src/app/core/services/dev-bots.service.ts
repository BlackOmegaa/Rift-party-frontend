import { Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BACKEND_URL } from './socket.service';

interface BotState {
  aliveIds: Set<string>;
  role: string | null;
  kindredMarked: boolean;
}

interface BotChampion {
  id: string;
  roles: string[];
  cost: number;
  tags: string[];
  rarity: string;
}

interface DraftBotState {
  championsPool: BotChampion[];
  budget: number;
  strategyCategories: { id: string; options: { id: string }[] }[];
}

const NIGHT_ACT_DELAY = () => 1200 + Math.random() * 4000;
const VOTE_DELAY = () => 1200 + Math.random() * 4000;
const READY_DELAY = () => 300 + Math.random() * 900;

type BotArchetype = 'dive' | 'poke' | 'teamfight' | 'splitpush';
const BOT_ARCHETYPES: BotArchetype[] = ['dive', 'poke', 'teamfight', 'splitpush'];
const RARITY_ORDER = ['commun', 'rare', 'tres-rare', 'epique', 'legendaire', 'mythique'];

/** Combien un champion "matche" l'archetype (0 = neutre) : mêmes tags que le bonus de coherence cote serveur (draft-scoring.engine.ts). */
const ARCHETYPE_TAG_SCORE: Record<BotArchetype, (tags: string[]) => number> = {
  dive: (tags) => (tags.includes('engage') ? 1 : 0) + (tags.includes('assassin') || tags.includes('fighter') ? 1 : 0),
  poke: (tags) => (tags.includes('poke') ? 2 : 0),
  teamfight: (tags) => (tags.includes('cc-heavy') ? 2 : 0) + (tags.includes('tank') ? 1 : 0),
  splitpush: (tags) => (tags.includes('scaling-late') ? 1 : 0) + (tags.includes('sustain') ? 1 : 0),
};

/** Meme mapping que ARCHETYPE_ALIGNMENT cote serveur (draft-scoring.engine.ts) : garde le bonus "identite d'equipe" cote bot aussi. */
const ARCHETYPE_STRATEGY: Record<BotArchetype, { macro: string; itemization: string }> = {
  dive: { macro: 'snowball', itemization: 'full-damage' },
  poke: { macro: 'vision', itemization: 'utility' },
  teamfight: { macro: 'objectives', itemization: 'resistances' },
  splitpush: { macro: 'scaling', itemization: 'resistances' },
};

/**
 * Bots de dev : ouvrent de vraies connexions socket.io qui rejoignent la
 * room comme n'importe quel joueur (le backend ne les distingue pas d'un
 * humain). Utile pour tester seul un mini-jeu qui demande beaucoup de
 * joueurs (ex: La Brume, min 8) sans avoir besoin d'amis sous la main.
 * L'auto-jeu ne couvre que "La Brume" pour l'instant ; les autres jeux
 * verront juste des bots connectes qui n'agissent pas.
 */
@Injectable({ providedIn: 'root' })
export class DevBotsService {
  private bots: Socket[] = [];
  readonly count = signal(0);

  fillRoom(roomCode: string, count: number, startIndex: number): void {
    for (let i = 0; i < count; i++) {
      this.spawnBot(roomCode, `Bot${startIndex + i}`);
    }
    this.count.set(this.bots.length);
  }

  private spawnBot(roomCode: string, pseudo: string): void {
    const sock: Socket = io(BACKEND_URL, { transports: ['websocket'] });
    const state: BotState = { aliveIds: new Set(), role: null, kindredMarked: false };
    const draftState: DraftBotState = { championsPool: [], budget: 0, strategyCategories: [] };

    sock.on('connect', () => sock.emit('room:join', { code: roomCode, pseudo }));

    sock.on(
      'draft:start',
      (payload: { budget: number; championsPool: DraftBotState['championsPool']; strategyCategories: DraftBotState['strategyCategories'] }) => {
        draftState.championsPool = payload.championsPool ?? [];
        draftState.budget = payload.budget ?? 0;
        draftState.strategyCategories = payload.strategyCategories ?? [];
        setTimeout(() => this.autoSubmitDraft(sock, draftState), READY_DELAY());
      },
    );

    sock.on('draft:round-matchup', () => {
      setTimeout(() => this.autoSubmitDraft(sock, draftState), READY_DELAY());
    });

    sock.on('brume:start', (payload: { players: { id: string; pseudo: string }[] }) => {
      state.aliveIds = new Set(payload.players.map((p) => p.id));
      state.role = null;
      state.kindredMarked = false;
    });

    sock.on('brume:reveal', (payload: { role: string }) => {
      state.role = payload.role;
      setTimeout(() => sock.emit('brume:reveal-ready'), READY_DELAY());
    });

    sock.on('brume:night-started', () => {
      setTimeout(() => this.autoNightAction(sock, state), NIGHT_ACT_DELAY());
    });

    sock.on('brume:dawn', (recap: { deaths: { playerId: string }[] }) => {
      for (const d of recap.deaths) state.aliveIds.delete(d.playerId);
    });

    sock.on('brume:vote-started', () => {
      setTimeout(() => this.autoVote(sock, state), VOTE_DELAY());
    });

    sock.on('brume:vote-result', (payload: { eliminatedId: string | null }) => {
      if (payload.eliminatedId) state.aliveIds.delete(payload.eliminatedId);
    });

    this.bots.push(sock);
  }

  private randomTarget(sock: Socket, state: BotState, excludeSelf = true): string | undefined {
    const ids = [...state.aliveIds].filter((id) => !excludeSelf || id !== sock.id);
    return ids[Math.floor(Math.random() * ids.length)];
  }

  private autoNightAction(sock: Socket, state: BotState): void {
    const target = this.randomTarget(sock, state);
    if (!target) return;
    switch (state.role) {
      case 'warwick':
        sock.emit('brume:night-action', {
          action: Math.random() < 0.7 ? 'consommer' : 'effroi',
          targetId: target,
        });
        break;
      case 'fiddlesticks':
        sock.emit('brume:night-action', { action: 'mark_fiddlesticks', targetId: target });
        break;
      case 'thresh':
        sock.emit('brume:night-action', {
          action: 'protect',
          targetId: this.randomTarget(sock, state, false),
        });
        break;
      case 'ashe':
        sock.emit('brume:night-action', { action: 'scout', targetId: target });
        break;
      case 'poro':
        sock.emit('brume:night-action', { action: 'huddle', targetId: target });
        break;
      case 'kindred':
        if (!state.kindredMarked) {
          sock.emit('brume:night-action', { action: 'mark_kindred', targetId: target });
          state.kindredMarked = true;
        } else {
          sock.emit('brume:night-action', { action: 'hunt' });
        }
        break;
    }
  }

  private autoVote(sock: Socket, state: BotState): void {
    const target = this.randomTarget(sock, state);
    if (target) sock.emit('brume:vote', { targetId: target });
  }

  /**
   * Draft Battle : le bot incarne UN archetype tire au sort (dive/poke/teamfight/
   * splitpush), aligne ses 3 choix de strategie dessus (meme mapping que le bonus
   * "identite d'equipe" cote serveur), privilegie les champions dont les tags
   * matchent cet archetype, et depense agressivement sur la plus haute rarete
   * finançable pour son role "carry" plutot que de piocher au hasard partout.
   * Rejoue a chaque nouveau round de tournoi (nouvel archetype a chaque fois).
   */
  private autoSubmitDraft(sock: Socket, state: DraftBotState): void {
    if (!state.championsPool.length) return;
    const roles = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
    const archetype = BOT_ARCHETYPES[Math.floor(Math.random() * BOT_ARCHETYPES.length)];
    const carryRoleCount = Math.random() < 0.35 ? 2 : 1;
    const carryRoles = new Set([...roles].sort(() => Math.random() - 0.5).slice(0, carryRoleCount));

    const championIds: string[] = [];
    let remaining = state.budget;

    for (const role of roles) {
      const candidates = state.championsPool.filter(
        (c) => c.roles.includes(role) && !championIds.includes(c.id),
      );
      if (!candidates.length) continue;

      const affordable = candidates.filter((c) => c.cost <= remaining);
      // Garantie d'achat : jamais bloque sur un role, on retombe sur le moins cher plutot qu'un pick au hasard qui ferait sauter le budget.
      const pool = affordable.length ? affordable : [[...candidates].sort((a, b) => a.cost - b.cost)[0]];

      const isCarry = carryRoles.has(role);
      const scored = pool.map((c) => {
        const archetypeScore = ARCHETYPE_TAG_SCORE[archetype](c.tags) * 10;
        const rarityRank = RARITY_ORDER.indexOf(c.rarity);
        const rarityScore = isCarry ? rarityRank * 6 : -rarityRank * 1.5;
        return { champion: c, score: archetypeScore + rarityScore + Math.random() * 4 };
      });
      scored.sort((a, b) => b.score - a.score);
      const pick = scored[0]?.champion;
      if (!pick) continue;
      championIds.push(pick.id);
      remaining -= pick.cost;
    }
    if (championIds.length !== 5) return;

    const alignment = ARCHETYPE_STRATEGY[archetype];
    const strategySelections: Record<string, string> = {};
    for (const category of state.strategyCategories) {
      const wanted =
        category.id === 'playstyle' ? archetype : category.id === 'macro' ? alignment.macro : category.id === 'itemization' ? alignment.itemization : null;
      const match = wanted ? category.options.find((o) => o.id === wanted) : undefined;
      const option = match ?? category.options[Math.floor(Math.random() * category.options.length)];
      if (option) strategySelections[category.id] = option.id;
    }
    sock.emit('draft:submit', { championIds, rerollsUsed: 0, strategySelections });
  }

  reset(): void {
    for (const bot of this.bots) bot.disconnect();
    this.bots = [];
    this.count.set(0);
  }
}
