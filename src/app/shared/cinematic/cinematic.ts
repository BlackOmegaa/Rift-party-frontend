import { gsap } from 'gsap';

/**
 * Boite a outils "game feel" partagee par les ecrans de jeu :
 * punchs, count-up sonorise, particules... Tout est du GSAP pur sur des
 * elements DOM, aucun etat Angular — chaque mini-jeu pioche ce qu'il veut.
 */

/** Zoom-punch d'entree : l'element surgit avec un leger overshoot. */
export function punchIn(el: Element | null, options?: { delay?: number; from?: number }): void {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.fromTo(
    el,
    { opacity: 0, scale: options?.from ?? 0.82 },
    { opacity: 1, scale: 1, duration: 0.55, delay: options?.delay ?? 0, ease: 'back.out(2.2)', clearProps: 'scale,opacity' },
  );
}

/** Slide d'entree depuis le bas, pour les barres/panneaux. */
export function slideUp(el: Element | null, options?: { delay?: number; distance?: number }): void {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.fromTo(
    el,
    { opacity: 0, y: options?.distance ?? 34 },
    { opacity: 1, y: 0, duration: 0.5, delay: options?.delay ?? 0, ease: 'power3.out', clearProps: 'transform,opacity' },
  );
}

/** Secousse horizontale (mauvaise reponse). */
export function shake(el: Element | null): void {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.fromTo(el, { x: 0 }, { x: 10, duration: 0.06, repeat: 7, yoyo: true, ease: 'power1.inOut', clearProps: 'x' });
}

/** Petit coup de zoom sur place (score qui encaisse des points). */
export function pulse(el: Element | null, scale = 1.22): void {
  if (!el) return;
  gsap.killTweensOf(el);
  gsap.fromTo(el, { scale }, { scale: 1, duration: 0.45, ease: 'elastic.out(1.1, 0.45)', clearProps: 'scale' });
}

/**
 * Compteur anime : incremente le texte de l'element vers `target`.
 * `onTick` est appele a chaque changement de valeur affichee (pour un SFX de tick).
 */
export function countUp(
  el: HTMLElement | null,
  target: number,
  options?: { duration?: number; from?: number; onTick?: (value: number) => void },
): void {
  if (!el) return;
  const state = { val: options?.from ?? 0 };
  let lastShown = -1;
  gsap.killTweensOf(state);
  gsap.to(state, {
    val: target,
    duration: options?.duration ?? 1.1,
    ease: 'power2.out',
    onUpdate: () => {
      const shown = Math.round(state.val);
      if (shown === lastShown) return;
      lastShown = shown;
      el.textContent = String(shown);
      options?.onTick?.(shown);
    },
  });
}

/**
 * Burst de particules DOM ephemeres au centre de `host` (position:relative requise).
 * Les particules sont creees puis detruites : rien a nettoyer cote composant.
 */
export function burstParticles(
  host: HTMLElement | null,
  options?: { colors?: string[]; count?: number; origin?: { x: number; y: number }; spread?: number },
): void {
  if (!host) return;
  const colors = options?.colors ?? ['#c8aa6e', '#f0e6d2', '#0ac8b9'];
  const count = options?.count ?? 26;
  const rect = host.getBoundingClientRect();
  const ox = options?.origin?.x ?? rect.width / 2;
  const oy = options?.origin?.y ?? rect.height / 2;
  const spread = options?.spread ?? Math.min(rect.width, rect.height) * 0.5;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    const size = 4 + Math.random() * 8;
    Object.assign(particle.style, {
      position: 'absolute',
      left: `${ox}px`,
      top: `${oy}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: Math.random() > 0.4 ? '50%' : '2px',
      background: colors[i % colors.length],
      pointerEvents: 'none',
      zIndex: '30',
      boxShadow: `0 0 ${size * 1.6}px ${colors[i % colors.length]}`,
    } satisfies Partial<CSSStyleDeclaration>);
    host.appendChild(particle);
    const angle = Math.random() * Math.PI * 2;
    const distance = spread * (0.4 + Math.random() * 0.9);
    gsap.to(particle, {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance - spread * 0.25,
      rotation: Math.random() * 360,
      opacity: 0,
      scale: 0.2,
      duration: 0.9 + Math.random() * 0.7,
      ease: 'power2.out',
      onComplete: () => particle.remove(),
    });
  }
}

/** Score flottant "+10" qui monte et disparait, au-dessus de `host`. */
export function floatScore(host: HTMLElement | null, text: string, color = '#3fd67a'): void {
  if (!host) return;
  const el = document.createElement('span');
  el.textContent = text;
  const rect = host.getBoundingClientRect();
  Object.assign(el.style, {
    position: 'absolute',
    left: `${rect.width / 2}px`,
    top: `${rect.height * 0.32}px`,
    transform: 'translate(-50%, 0)',
    fontSize: 'clamp(2.4rem, 6vw, 4.6rem)',
    fontWeight: '1000',
    color,
    textShadow: `0 0 24px ${color}, 0 4px 18px rgba(0,0,0,.6)`,
    pointerEvents: 'none',
    zIndex: '31',
    whiteSpace: 'nowrap',
  } satisfies Partial<CSSStyleDeclaration>);
  host.appendChild(el);
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.5, yPercent: 0 },
    {
      keyframes: [
        { opacity: 1, scale: 1.15, duration: 0.22, ease: 'back.out(3)' },
        { scale: 1, duration: 0.15 },
        { yPercent: -160, opacity: 0, duration: 0.9, delay: 0.35, ease: 'power2.in' },
      ],
      onComplete: () => el.remove(),
    },
  );
}
