import { gsap } from "gsap";

/**
 * Entree GSAP partagee par les ecrans de fin (guess-champion, fusion-champions,
 * turret-tank) : stagger sur les lignes de classement + compteur qui s'incremente
 * sur le score final (element marque `[data-count-up]`), plutot qu'un simple
 * `@if` statique.
 */
export function animateEndScreen(
	root: HTMLElement | null,
	options?: { onCountTick?: (value: number) => void },
): void {
	if (!root) return;
	requestAnimationFrame(() => {
		const rows = root.querySelectorAll<HTMLElement>(".lb-row");
		if (rows.length) {
			gsap.killTweensOf(rows);
			gsap.from(rows, { opacity: 0, y: 14, duration: 0.4, stagger: 0.06, ease: "power2.out" });
		}

		const counters = root.querySelectorAll<HTMLElement>("[data-count-up]");
		counters.forEach((el) => {
			const target = Number(el.textContent?.trim() ?? 0);
			if (!Number.isFinite(target)) return;
			const obj = { val: 0 };
			let lastShown = -1;
			gsap.killTweensOf(obj);
			gsap.to(obj, {
				val: target,
				duration: 0.7,
				ease: "power2.out",
				onUpdate: () => {
					const shown = Math.round(obj.val);
					if (shown === lastShown) return;
					lastShown = shown;
					el.textContent = String(shown);
					options?.onCountTick?.(shown);
				},
			});
		});
	});
}
