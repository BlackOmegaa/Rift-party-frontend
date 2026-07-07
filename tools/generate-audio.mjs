/**
 * Générateur d'assets audio procéduraux pour Rift Party.
 * Usage : node tools/generate-audio.mjs
 * Sort les fichiers WAV dans src/assets/audio/ (SFX mono 44.1kHz, musiques stéréo 22.05kHz).
 * Les sons sont synthétisés (oscillateurs + bruit + enveloppes) : zéro dépendance,
 * régénérables à volonté, et remplaçables un par un par des assets pro plus tard.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'assets', 'audio');
mkdirSync(OUT_DIR, { recursive: true });

const TAU = Math.PI * 2;

// ---------- WAV encoding ----------
function writeWav(name, channels, sampleRate) {
  const numCh = channels.length;
  const len = channels[0].length;
  const data = Buffer.alloc(len * numCh * 2);
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      data.writeInt16LE(Math.round(v * 32767), (i * numCh + c) * 2);
    }
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numCh, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * numCh * 2, 28);
  header.writeUInt16LE(numCh * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT_DIR, name), Buffer.concat([header, data]));
  console.log(`  ${name}  (${((header.length + data.length) / 1024).toFixed(0)} KB)`);
}

// ---------- Synth helpers ----------
const buf = (sec, rate) => new Float32Array(Math.round(sec * rate));

/** Enveloppe attack/decay exponentielle simple. */
function env(t, attack, decay, sustain = 0) {
  if (t < attack) return t / attack;
  const d = (t - attack) / decay;
  return d >= 1 ? sustain : (1 - sustain) * Math.exp(-5 * d) + sustain;
}

function addTone(out, rate, { freq, freqEnd, start = 0, dur, amp = 0.5, attack = 0.005, decay, shape = 'sine', detune = 0 }) {
  decay = decay ?? dur;
  const s0 = Math.round(start * rate);
  const n = Math.min(Math.round(dur * rate), out.length - s0);
  const f0 = freq * (1 + detune);
  const f1 = (freqEnd ?? freq) * (1 + detune);
  let phase = Math.random() * TAU * (shape === 'sine' ? 0 : 1);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const f = f0 + (f1 - f0) * (t / dur);
    phase += (TAU * f) / rate;
    let v;
    switch (shape) {
      case 'square': v = Math.sign(Math.sin(phase)) * 0.35; break;
      case 'saw': v = ((phase / TAU) % 1) * 2 - 1; v *= 0.4; break;
      case 'triangle': v = Math.asin(Math.sin(phase)) * (2 / Math.PI) * 0.7; break;
      default: v = Math.sin(phase);
    }
    out[s0 + i] += v * amp * env(t, attack, decay);
  }
}

function addNoise(out, rate, { start = 0, dur, amp = 0.3, attack = 0.002, decay, lpStart = 1, lpEnd }) {
  decay = decay ?? dur;
  const s0 = Math.round(start * rate);
  const n = Math.min(Math.round(dur * rate), out.length - s0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    // filtre passe-bas one-pole dont le coefficient glisse de lpStart vers lpEnd (1 = brillant, 0.01 = sourd)
    const k = lpEnd === undefined ? lpStart : lpStart + (lpEnd - lpStart) * (t / dur);
    last += k * ((Math.random() * 2 - 1) - last);
    out[s0 + i] += last * amp * env(t, attack, decay);
  }
}

/** Écho simple pour donner de l'espace (feedback delay). */
function addEcho(out, rate, delaySec, feedback, wet) {
  const d = Math.round(delaySec * rate);
  for (let i = d; i < out.length; i++) out[i] += out[i - d] * feedback * wet;
}

function normalize(out, peak = 0.92) {
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  if (max > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i] / max) * peak;
}

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // midi -> Hz

// ---------- SFX (44.1 kHz mono) ----------
const SR = 44100;
console.log('SFX :');

{ // ui-click : petit blip sec
  const o = buf(0.12, SR);
  addTone(o, SR, { freq: 1900, freqEnd: 1400, dur: 0.06, amp: 0.5, attack: 0.001, shape: 'triangle' });
  addNoise(o, SR, { dur: 0.03, amp: 0.15, lpStart: 0.6 });
  normalize(o, 0.7); writeWav('ui-click.wav', [o], SR);
}

{ // hint : pop doux ascendant (révélation d'indice)
  const o = buf(0.35, SR);
  addTone(o, SR, { freq: 520, freqEnd: 880, dur: 0.16, amp: 0.5, attack: 0.004, shape: 'sine' });
  addTone(o, SR, { freq: 1040, freqEnd: 1760, dur: 0.14, start: 0.02, amp: 0.2, shape: 'sine' });
  addEcho(o, SR, 0.09, 0.3, 0.4);
  normalize(o, 0.72); writeWav('hint.wav', [o], SR);
}

{ // whoosh : balayage de bruit (transitions)
  const o = buf(0.6, SR);
  addNoise(o, SR, { dur: 0.55, amp: 0.8, attack: 0.18, decay: 0.3, lpStart: 0.04, lpEnd: 0.5 });
  normalize(o, 0.8); writeWav('whoosh.wav', [o], SR);
}

{ // impact : gros boom + ring métallique (slam de titre)
  const o = buf(1.4, SR);
  addTone(o, SR, { freq: 150, freqEnd: 42, dur: 0.5, amp: 1.0, attack: 0.002, shape: 'sine' });
  addNoise(o, SR, { dur: 0.25, amp: 0.55, lpStart: 0.9, lpEnd: 0.05 });
  addTone(o, SR, { freq: 523, dur: 1.1, start: 0.02, amp: 0.1, attack: 0.001, shape: 'triangle' });
  addTone(o, SR, { freq: 784, dur: 0.9, start: 0.02, amp: 0.06, attack: 0.001, shape: 'sine', detune: 0.004 });
  addEcho(o, SR, 0.13, 0.35, 0.3);
  normalize(o, 0.95); writeWav('impact.wav', [o], SR);
}

{ // countdown-tick : bip de décompte (3, 2, 1)
  const o = buf(0.3, SR);
  addTone(o, SR, { freq: 660, dur: 0.14, amp: 0.7, attack: 0.002, shape: 'square' });
  addTone(o, SR, { freq: 1320, dur: 0.1, amp: 0.15, attack: 0.002, shape: 'sine' });
  normalize(o, 0.75); writeWav('countdown-tick.wav', [o], SR);
}

{ // countdown-go : GO! accord majeur punchy
  const o = buf(0.9, SR);
  for (const [i, m] of [64, 68, 71, 76].entries()) { // E majeur
    addTone(o, SR, { freq: NOTE(m), dur: 0.55, start: i * 0.012, amp: 0.4, attack: 0.004, shape: 'saw' });
    addTone(o, SR, { freq: NOTE(m + 12), dur: 0.4, start: i * 0.012, amp: 0.14, shape: 'sine' });
  }
  addNoise(o, SR, { dur: 0.12, amp: 0.3, lpStart: 0.8, lpEnd: 0.1 });
  addTone(o, SR, { freq: 130, freqEnd: 60, dur: 0.3, amp: 0.7, attack: 0.002 });
  addEcho(o, SR, 0.11, 0.3, 0.35);
  normalize(o, 0.9); writeWav('countdown-go.wav', [o], SR);
}

{ // correct : carillon lumineux à deux notes + sparkle
  const o = buf(1.1, SR);
  addTone(o, SR, { freq: NOTE(88), dur: 0.5, amp: 0.5, attack: 0.003, shape: 'sine' });      // E6
  addTone(o, SR, { freq: NOTE(95), dur: 0.7, start: 0.09, amp: 0.5, attack: 0.003 });        // B6
  addTone(o, SR, { freq: NOTE(100), dur: 0.6, start: 0.18, amp: 0.3, attack: 0.003 });       // E7
  for (let i = 0; i < 6; i++) addTone(o, SR, { freq: 2200 + Math.random() * 2600, dur: 0.12, start: 0.2 + i * 0.05, amp: 0.08 });
  addEcho(o, SR, 0.14, 0.35, 0.5);
  normalize(o, 0.85); writeWav('correct.wav', [o], SR);
}

{ // wrong : buzz grave descendant
  const o = buf(0.7, SR);
  addTone(o, SR, { freq: 185, freqEnd: 138, dur: 0.4, amp: 0.6, attack: 0.004, shape: 'saw' });
  addTone(o, SR, { freq: 92, freqEnd: 69, dur: 0.4, amp: 0.5, attack: 0.004, shape: 'square' });
  normalize(o, 0.75); writeWav('wrong.wav', [o], SR);
}

{ // timeout : trois notes descendantes tristes
  const o = buf(1.2, SR);
  for (const [i, m] of [69, 65, 60].entries()) {
    addTone(o, SR, { freq: NOTE(m), dur: 0.32, start: i * 0.22, amp: 0.5, attack: 0.006, shape: 'triangle' });
  }
  addEcho(o, SR, 0.16, 0.3, 0.4);
  normalize(o, 0.75); writeWav('timeout.wav', [o], SR);
}

{ // timer-urgent : battement sourd (joué chaque seconde en fin de timer)
  const o = buf(0.35, SR);
  addTone(o, SR, { freq: 220, freqEnd: 160, dur: 0.09, amp: 0.8, attack: 0.002 });
  addTone(o, SR, { freq: 880, dur: 0.05, amp: 0.2, attack: 0.001, shape: 'square' });
  normalize(o, 0.8); writeWav('timer-urgent.wav', [o], SR);
}

{ // reveal : riser scintillant (dé-floutage du splash)
  const o = buf(1.3, SR);
  addNoise(o, SR, { dur: 0.7, amp: 0.4, attack: 0.5, decay: 0.2, lpStart: 0.05, lpEnd: 0.7 });
  addTone(o, SR, { freq: 300, freqEnd: 1200, dur: 0.7, amp: 0.18, attack: 0.4, shape: 'sine' });
  for (let i = 0; i < 10; i++) addTone(o, SR, { freq: 1800 + Math.random() * 3200, dur: 0.15, start: 0.55 + i * 0.045, amp: 0.09 });
  addTone(o, SR, { freq: NOTE(76), dur: 0.5, start: 0.68, amp: 0.35, attack: 0.005 });
  addEcho(o, SR, 0.12, 0.3, 0.45);
  normalize(o, 0.85); writeWav('reveal.wav', [o], SR);
}

{ // score-tick : mini tick pour count-up
  const o = buf(0.06, SR);
  addTone(o, SR, { freq: 2400, dur: 0.035, amp: 0.4, attack: 0.001, shape: 'triangle' });
  normalize(o, 0.55); writeWav('score-tick.wav', [o], SR);
}

{ // round-win : stinger positif court (fin de round réussie)
  const o = buf(1.0, SR);
  for (const [i, m] of [72, 76, 79, 84].entries()) {
    addTone(o, SR, { freq: NOTE(m), dur: 0.4, start: i * 0.07, amp: 0.4, attack: 0.004, shape: 'triangle' });
  }
  addEcho(o, SR, 0.12, 0.3, 0.4);
  normalize(o, 0.8); writeWav('round-win.wav', [o], SR);
}

{ // fanfare : victoire de partie (accords montants + shimmer)
  const o = buf(2.6, SR);
  const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [72, 76, 79, 84]];
  chords.forEach((chord, ci) => {
    chord.forEach((m, ni) => {
      addTone(o, SR, { freq: NOTE(m), dur: ci === 3 ? 1.2 : 0.4, start: ci * 0.3 + ni * 0.015, amp: 0.32, attack: 0.005, shape: 'saw' });
      addTone(o, SR, { freq: NOTE(m + 12), dur: ci === 3 ? 1.0 : 0.3, start: ci * 0.3 + ni * 0.015, amp: 0.1, shape: 'sine' });
    });
  });
  addNoise(o, SR, { start: 0.9, dur: 1.2, amp: 0.12, attack: 0.05, decay: 1.0, lpStart: 0.85, lpEnd: 0.2 });
  for (let i = 0; i < 14; i++) addTone(o, SR, { freq: 1600 + Math.random() * 3600, dur: 0.18, start: 1.0 + i * 0.09, amp: 0.07 });
  addEcho(o, SR, 0.15, 0.35, 0.4);
  normalize(o, 0.9); writeWav('fanfare.wav', [o], SR);
}

{ // swap : petit swoosh court (changement de manche / element qui glisse)
  const o = buf(0.3, SR);
  addNoise(o, SR, { dur: 0.26, amp: 0.6, attack: 0.06, decay: 0.16, lpStart: 0.5, lpEnd: 0.08 });
  normalize(o, 0.65); writeWav('swap.wav', [o], SR);
}

// ---------- Musiques (22.05 kHz stéréo, loops calées sur la grille) ----------
const MR = 22050;
console.log('Musiques :');

/**
 * Boucle "tension" pour les manches : ambiance discrete et feutree, pensee pour
 * tourner tres bas sous le jeu sans jamais agresser. Que des sinus/triangles a
 * attaque douce : sub-basse posee, nappe qui respire, motif plucke espace et
 * un souffle d'air leger. 84 BPM, 8 mesures (~22.9s), boucle propre.
 */
{
  const BPM = 84, spb = 60 / BPM, dur = 32 * spb;
  const L = buf(dur, MR), R = buf(dur, MR);
  // Em - C - G - D : progression familiere, jouee tres bas
  const roots = [52, 52, 48, 48, 43, 43, 50, 50]; // E2 E2 C2 C2 G1... (midi)
  const chordOf = (root) => [root + 12, root + 19, root + 24, root + 27]; // fond., quinte, octave, tierce min haute
  for (let bar = 0; bar < 8; bar++) {
    const root = roots[bar];
    const barStart = bar * 4 * spb;
    // Sub-basse : une note posee par mesure, ronde et discrete
    for (const [ch] of [[L], [R]]) {
      addTone(ch, MR, { freq: NOTE(root - 12), dur: 3.6 * spb, start: barStart, amp: 0.3, attack: 0.06, decay: 3.4 * spb, shape: 'sine' });
    }
    // Nappe : accord tenu, attaque tres lente, leger chorus stereo
    for (const m of chordOf(root)) {
      addTone(L, MR, { freq: NOTE(m), dur: 4.4 * spb, start: barStart, amp: 0.045, attack: 1.4, decay: 4.2 * spb, shape: 'triangle', detune: 0.0025 });
      addTone(R, MR, { freq: NOTE(m), dur: 4.4 * spb, start: barStart, amp: 0.045, attack: 1.4, decay: 4.2 * spb, shape: 'triangle', detune: -0.0025 });
    }
    // Motif plucke : 2-3 notes espacees par mesure, jamais un arpege mitraillette
    const motif = [
      [0, root + 24], [1.5, root + 31], [3, root + 27],
    ];
    for (const [beat, m] of motif) {
      const t = barStart + beat * spb;
      const side = (bar + beat) % 2 === 0 ? L : R;
      const other = side === L ? R : L;
      addTone(side, MR, { freq: NOTE(m), dur: spb * 1.1, start: t, amp: 0.09, attack: 0.012, shape: 'sine' });
      addTone(other, MR, { freq: NOTE(m), dur: spb * 1.1, start: t, amp: 0.045, attack: 0.012, shape: 'sine' });
    }
    // Souffle d'air : leger swell de bruit filtre sombre en fin de mesure paire
    if (bar % 2 === 1) {
      addNoise(L, MR, { start: barStart + 2 * spb, dur: 2 * spb, amp: 0.03, attack: spb, decay: spb, lpStart: 0.03, lpEnd: 0.08 });
      addNoise(R, MR, { start: barStart + 2 * spb, dur: 2 * spb, amp: 0.03, attack: spb, decay: spb, lpStart: 0.03, lpEnd: 0.08 });
    }
  }
  addEcho(L, MR, spb * 0.75, 0.32, 0.4);
  addEcho(R, MR, spb * 1.0, 0.32, 0.4);
  normalize(L, 0.55); normalize(R, 0.55);
  writeWav('music-tension.wav', [L, R], MR);
}

/**
 * Boucle "ambient" pour lobby / ecrans de scores : nappe chaude et calme,
 * sinus purs superposes avec chorus stereo lent, cloches rares et lointaines.
 * 4 accords de 6s (24s), tres douce.
 */
{
  const chordDur = 6, dur = 4 * chordDur;
  const L = buf(dur, MR), R = buf(dur, MR);
  const chords = [[48, 55, 60, 64], [45, 52, 57, 64], [41, 48, 55, 60], [43, 50, 55, 62]]; // Cmaj - Am7 - Fmaj - G
  chords.forEach((chord, ci) => {
    const start = ci * chordDur;
    chord.forEach((m, ni) => {
      // Deux couches de sinus legerement desaccordees = chorus naturel, zero agressivite
      addTone(L, MR, { freq: NOTE(m + 12), dur: chordDur + 1.2, start, amp: 0.07, attack: 2.2, decay: chordDur, shape: 'sine', detune: 0.002 });
      addTone(R, MR, { freq: NOTE(m + 12), dur: chordDur + 1.2, start, amp: 0.07, attack: 2.2, decay: chordDur, shape: 'sine', detune: -0.002 });
      addTone(L, MR, { freq: NOTE(m), dur: chordDur + 1.2, start, amp: 0.05, attack: 2.6, decay: chordDur, shape: 'triangle', detune: -0.0015 });
      addTone(R, MR, { freq: NOTE(m), dur: chordDur + 1.2, start, amp: 0.05, attack: 2.6, decay: chordDur, shape: 'triangle', detune: 0.0015 });
      // Une seule cloche lointaine par accord, sur la note la plus haute
      if (ni === chord.length - 1) {
        addTone(ci % 2 ? L : R, MR, { freq: NOTE(m + 24), dur: 2.6, start: start + 2.4, amp: 0.035, attack: 0.02, shape: 'sine' });
      }
    });
  });
  addEcho(L, MR, 0.37, 0.4, 0.45);
  addEcho(R, MR, 0.53, 0.4, 0.45);
  normalize(L, 0.5); normalize(R, 0.5);
  writeWav('music-ambient.wav', [L, R], MR);
}

console.log('OK ->', OUT_DIR);
