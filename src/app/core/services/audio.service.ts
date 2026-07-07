import { Injectable, signal } from '@angular/core';
import { Howl, Howler } from 'howler';

/** Assets generes par tools/generate-audio.mjs (node tools/generate-audio.mjs pour regenerer). */
export type SfxName =
  | 'ui-click'
  | 'hint'
  | 'whoosh'
  | 'impact'
  | 'countdown-tick'
  | 'countdown-go'
  | 'correct'
  | 'wrong'
  | 'timeout'
  | 'timer-urgent'
  | 'reveal'
  | 'score-tick'
  | 'round-win'
  | 'fanfare'
  | 'swap';

export type MusicName = 'tension' | 'ambient';

interface AudioPrefs {
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
}

const PREFS_KEY = 'rift-party-audio';
const MUSIC_FADE_MS = 900;

/**
 * Moteur audio global (Howler) : SFX ponctuels + canal musique unique avec crossfade.
 * Howler gere lui-meme le deblocage de l'AudioContext au premier geste utilisateur,
 * donc on peut appeler play() des le debut sans se soucier des politiques d'autoplay.
 */
@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly muted = signal(false);
  /** Volumes exposes en signaux : le panneau son (sound-toggle) les affiche en sliders. */
  readonly sfxVolume = signal(0.7);
  readonly musicVolume = signal(0.25);

  private readonly sfxCache = new Map<SfxName, Howl>();
  private readonly musicCache = new Map<MusicName, Howl>();
  private currentMusic: MusicName | null = null;

  constructor() {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as Partial<AudioPrefs>;
      this.muted.set(prefs.muted ?? false);
      this.sfxVolume.set(prefs.sfxVolume ?? 0.7);
      this.musicVolume.set(prefs.musicVolume ?? 0.25);
    } catch {
      // prefs corrompues : on repart sur les valeurs par defaut
    }
    Howler.mute(this.muted());
  }

  /** Joue un SFX. `rate` permet de varier le pitch (ex: count-up qui monte). */
  play(name: SfxName, options?: { volume?: number; rate?: number }): void {
    const howl = this.sfx(name);
    const id = howl.play();
    howl.volume((options?.volume ?? 1) * this.sfxVolume(), id);
    if (options?.rate) howl.rate(options.rate, id);
  }

  /** Bascule le canal musique vers une boucle (crossfade), no-op si deja active. */
  playMusic(name: MusicName): void {
    if (this.currentMusic === name) return;
    const previous = this.currentMusic ? this.musicCache.get(this.currentMusic) : null;
    this.currentMusic = name;
    if (previous?.playing()) {
      previous.fade(previous.volume() as number, 0, MUSIC_FADE_MS);
      previous.once('fade', () => previous.stop());
    }
    const next = this.music(name);
    if (!next.playing()) next.play();
    next.fade(0, this.musicVolume(), MUSIC_FADE_MS);
  }

  setMusicVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1, volume));
    this.musicVolume.set(clamped);
    // Applique en direct sur la boucle en cours, sans attendre le prochain crossfade.
    if (this.currentMusic) this.musicCache.get(this.currentMusic)?.volume(clamped);
    this.persist();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume.set(Math.max(0, Math.min(1, volume)));
    this.persist();
  }

  stopMusic(): void {
    if (!this.currentMusic) return;
    const current = this.musicCache.get(this.currentMusic);
    this.currentMusic = null;
    if (current?.playing()) {
      current.fade(current.volume() as number, 0, MUSIC_FADE_MS);
      setTimeout(() => current.stop(), MUSIC_FADE_MS + 50);
    }
  }

  toggleMute(): void {
    this.muted.update((m) => !m);
    Howler.mute(this.muted());
    this.persist();
  }

  private sfx(name: SfxName): Howl {
    let howl = this.sfxCache.get(name);
    if (!howl) {
      howl = new Howl({ src: [`assets/audio/${name}.wav`], preload: true });
      this.sfxCache.set(name, howl);
    }
    return howl;
  }

  private music(name: MusicName): Howl {
    let howl = this.musicCache.get(name);
    if (!howl) {
      howl = new Howl({ src: [`assets/audio/music-${name}.wav`], loop: true, volume: 0 });
      this.musicCache.set(name, howl);
    }
    return howl;
  }

  private persist(): void {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ muted: this.muted(), sfxVolume: this.sfxVolume(), musicVolume: this.musicVolume() } satisfies AudioPrefs),
    );
  }
}
