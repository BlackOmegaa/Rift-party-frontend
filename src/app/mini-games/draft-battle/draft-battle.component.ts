import { NgTemplateOutlet } from "@angular/common";
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	DestroyRef,
	effect,
	inject,
	OnDestroy,
	signal,
} from "@angular/core";
import { gsap } from "gsap";
import { DraftResultComponent } from "./draft-result/draft-result.component";
import { DraftService } from "../../core/services/draft.service";
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import {
	Champion,
	ChampionRarity,
	cloneSourceOf,
	DraftEvent,
	DRAFT_EVENT_META,
	DraftMatchState,
	DraftResult,
	isCloneId,
	MatchScenario,
	RARITY_META,
	Role,
	RoundMatchup,
	ScenarioPhase,
	ScenarioPhaseKind,
	StrategySelections,
	TournamentRoundState,
} from "../../core/models/draft.model";
import { championSplashUrl, championSquareUrl } from "../../shared/lol-assets";
import { IconComponent, IconName } from "../../shared/components/icon/icon.component";
import { AudioService } from "../../core/services/audio.service";
import { burstParticles, countUp, pulse } from "../../shared/cinematic/cinematic";

const ROLE_ORDER: Role[] = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];
const ROLE_LABEL: Record<Role, string> = {
	TOP: "Toplane",
	JUNGLE: "Jungle",
	MID: "Mid",
	ADC: "Botlane",
	SUPPORT: "Support",
};

@Component({
	selector: "app-draft-battle",
	standalone: true,
	imports: [DraftResultComponent, NgTemplateOutlet, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./draft-battle.component.html",
	styleUrl: "./draft-battle.component.scss",
})
export class DraftBattleComponent implements OnDestroy {
	protected readonly roles = ROLE_ORDER;

	/**
	 * Vrai des que le composant est detruit. Sert de garde-fou aux boucles de
	 * re-essai `requestAnimationFrame(() => this.animateXxx())` : sans lui, un
	 * composant demonte pendant que le DOM cible n'existe pas encore laissait
	 * une boucle rAF infinie tourner pour toujours (querySelector rate ->
	 * re-planification a chaque frame), bien apres la fin du jeu.
	 */
	private destroyed = false;
	/**
	 * Toutes les animations GSAP a callbacks (timelines de reveal, pulses de
	 * confirmation, transition "Drafter !", delayedCalls...) creees par ce
	 * composant : tuees en bloc dans ngOnDestroy. Leurs `.call()`/`onComplete`
	 * jouent des sons (fanfare, impacts, decompte) et font avancer des signaux
	 * (`revealMatchup`, `drafterReady`, `advanceStep`) — aucun ne doit survivre
	 * au composant, surtout en Party Mix ou le jeu suivant est deja a l'ecran.
	 */
	private readonly liveAnims: gsap.core.Animation[] = [];

	/** Enregistre une animation GSAP pour la tuer a la destruction (et purge au passage celles deja terminees pour que la liste reste courte). */
	private track<T extends gsap.core.Animation>(anim: T): T {
		for (let i = this.liveAnims.length - 1; i >= 0; i--) {
			if (this.liveAnims[i].totalProgress() === 1) this.liveAnims.splice(i, 1);
		}
		this.liveAnims.push(anim);
		return anim;
	}

	ngOnDestroy(): void {
		this.destroyed = true;
		this.vsRevealTimeline?.kill();
		this.vsRevealTimeline = null;
		this.vsRevealReadyCall?.kill();
		this.vsRevealReadyCall = null;
		for (const anim of this.liveAnims) anim.kill();
		this.liveAnims.length = 0;
	}

	// ---- phase de pick (partagee : mode simple, et rejouee a chaque round de tournoi) ----
	private readonly picksByRole = signal<Partial<Record<Role, Champion>>>({});
	protected readonly currentIndex = signal(0);
	protected readonly offers = signal<Champion[]>([]);
	submitted = signal(false);
	protected readonly maxRerolls = 3;
	protected readonly rerollPenalty = 5;
	protected readonly rerollsUsed = signal(0);
	protected readonly strategySelections = signal<StrategySelections>({});
	/** Empeche un double-clic (plus rapide que l'animation de confirmation ~0.3s) de faire sauter un role/une categorie sans pick enregistre. */
	private readonly confirmingStep = signal(false);
	private readonly svgCardWidth = 226;
	private readonly svgSlotGap = 64;
	private readonly svgTopPadding = 92;
	private readonly svgBottomPadding = 92;
	private readonly svgRoundGap = 330;
	private readonly svgStartX = 120;

	svgWidth(): number {
		const rounds = this.draft.tournamentProgress()?.rounds.length ?? 1;
		return Math.max(
			980,
			this.svgStartX +
				(rounds - 1) * this.svgRoundGap +
				this.svgCardWidth +
				180,
		);
	}

	svgHeight(): number {
		const progress = this.draft.tournamentProgress();
		const maxMatches = Math.max(
			1,
			...(progress?.rounds.map((r) => r.matches.length) ?? [1]),
		);
		return Math.max(
			520,
			this.svgTopPadding + this.svgBottomPadding + maxMatches * 132,
		);
	}

	svgViewBox(): string {
		return `0 0 ${this.svgWidth()} ${this.svgHeight()}`;
	}

	svgRoundX(roundIndex: number): number {
		return this.svgStartX + roundIndex * this.svgRoundGap;
	}

	svgMatchCenterY(roundIndex: number, matchIndex: number): number {
		const count =
			this.draft.tournamentProgress()?.rounds[roundIndex]?.matches.length ?? 1;
		const usableHeight =
			this.svgHeight() - this.svgTopPadding - this.svgBottomPadding;
		return this.svgTopPadding + ((matchIndex + 0.5) * usableHeight) / count;
	}

	private svgSlotY(
		roundIndex: number,
		matchIndex: number,
		slot: number,
	): number {
		return (
			this.svgMatchCenterY(roundIndex, matchIndex) +
			(slot === 0 ? -this.svgSlotGap / 2 : this.svgSlotGap / 2)
		);
	}

	svgSlotTransform(
		roundIndex: number,
		matchIndex: number,
		slot: number,
	): string {
		return `translate(${this.svgRoundX(roundIndex)}, ${this.svgSlotY(roundIndex, matchIndex, slot)})`;
	}

	svgSlotPlayerId(match: DraftMatchState, slot: number): string {
		return slot === 0 ? match.playerAId : match.playerBId;
	}

	isSvgSlotWinner(match: DraftMatchState, slot: number): boolean {
		return (
			match.status === "resolved" &&
			this.isMatchRevealed(match) &&
			match.winnerId === this.svgSlotPlayerId(match, slot)
		);
	}

	isSvgSlotEliminated(match: DraftMatchState, slot: number): boolean {
		return (
			match.status === "resolved" &&
			this.isMatchRevealed(match) &&
			!!match.winnerId &&
			match.winnerId !== this.svgSlotPlayerId(match, slot)
		);
	}

	svgSlotStatus(match: DraftMatchState, slot: number): string {
		if (this.isSvgSlotWinner(match, slot)) return "WINNER";
		if (this.isSvgSlotEliminated(match, slot)) return "OUT";
		return "LOCKED";
	}

	initialsOfPlayer(playerId: string): string {
		const pseudo = this.pseudoOf(playerId);
		return pseudo
			.split(/\s+/)
			.map((p) => p[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}

	svgWinnerPath(
		match: DraftMatchState,
		roundIndex: number,
		matchIndex: number,
	): string | null {
		if (match.status !== "resolved" || !match.winnerId) return null;
		const progress = this.draft.tournamentProgress();
		if (!progress || roundIndex >= progress.rounds.length - 1) return null;

		const slot = match.winnerId === match.playerAId ? 0 : 1;
		const x1 = this.svgRoundX(roundIndex) + this.svgCardWidth;
		const y1 = this.svgSlotY(roundIndex, matchIndex, slot);
		const x2 = this.svgRoundX(roundIndex + 1) - 40;
		const y2 = this.svgMatchCenterY(roundIndex + 1, Math.floor(matchIndex / 2));
		const midX = x1 + (x2 - x1) / 2;

		return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
	}

	svgPendingPath(roundIndex: number, matchIndex: number): string | null {
		const progress = this.draft.tournamentProgress();
		if (!progress || roundIndex >= progress.rounds.length - 1) return null;

		const x1 = this.svgRoundX(roundIndex) + this.svgCardWidth;
		const y1 = this.svgMatchCenterY(roundIndex, matchIndex);
		const x2 = this.svgRoundX(roundIndex + 1) - 40;
		const y2 = this.svgMatchCenterY(roundIndex + 1, Math.floor(matchIndex / 2));
		const midX = x1 + (x2 - x1) / 2;

		return `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`;
	}

	/**
	 * Anime l'apparition du dialog bracket : cartes qui rentrent en cascade,
	 * traits de progression "dessines" vers le round suivant, pulse doree sur
	 * les vainqueurs et fondu grisonnant sur les elimines. Rejoue a chaque
	 * fois que le dialog s'affiche ou que le bracket change pendant qu'il est
	 * affiche (cf. l'effect qui l'appelle).
	 */
	private animateBracketReveal(): void {
		if (this.destroyed) return;
		const svg = document.querySelector<SVGSVGElement>(".svg-bracket");
		if (!svg) {
			// Le dialog vient tout juste de s'ouvrir : Angular n'a peut-etre pas
			// encore peint le SVG. On retente au prochain frame plutot que
			// d'abandonner silencieusement.
			requestAnimationFrame(() => this.animateBracketReveal());
			return;
		}

		const roundLabels = svg.querySelectorAll(".svg-round-label");
		const playerInners = svg.querySelectorAll(".svg-player-inner");
		const winnerInners = svg.querySelectorAll<SVGGElement>(".svg-player.winner .svg-player-inner");
		gsap.killTweensOf([roundLabels, playerInners, winnerInners] as unknown as gsap.TweenTarget[]);

		// IMPORTANT : masquer AVANT de programmer quoi que ce soit d'autre, dans
		// le meme tick que l'effect qui declenche cette methode (pas dans un
		// requestAnimationFrame). Sinon le navigateur a une fenetre pour peindre
		// une frame ou tout est deja visible (etat CSS par defaut) avant que GSAP
		// ne masque puis ranime : un flash visible "apparait/disparait" avant la
		// vraie animation.
		gsap.set(roundLabels, { opacity: 0, y: -10 });
		gsap.set(playerInners, { opacity: 0, x: -20, scale: 0.92 });

		const tl = this.track(gsap.timeline());

		tl.to(roundLabels, { opacity: 1, y: 0, duration: 0.35, stagger: 0.08, ease: "power2.out" }, 0);

		// Une seule tween d'entree pour toutes les cartes (vivantes ET
		// eliminees) : elle amene tout le monde a opacite pleine, puis on
		// nettoie les styles inline en fin de timeline pour laisser les
		// classes CSS (`.eliminated .svg-player-inner { opacity: 0.45 }`)
		// reprendre la main. Sans ce clearProps, le style inline laisse par
		// GSAP restait bloque a l'etat de depart pour certaines cartes et les
		// perdants "disparaissaient" (opacite 0 figee) au lieu de finir grises.
		tl.to(playerInners, { opacity: 1, x: 0, scale: 1, duration: 0.4, stagger: 0.05, ease: "back.out(1.6)" }, 0.1);

		tl.set(playerInners, { clearProps: "opacity,transform" });

		// Pulse doree sur les vainqueurs une fois toutes les cartes posees : un
		// vrai "coup de coeur" (scale + glow via pulse()) plutot qu'un simple
		// flash de luminosite, joue une fois par carte gagnante (pas de halo qui
		// tourne en continu).
		if (winnerInners.length) {
			tl.call(
				() => {
					this.audio.play("round-win", { volume: 0.55 });
					winnerInners.forEach((el) => pulse(el, 1.14));
				},
				undefined,
				0.65,
			);
		}

		// Le trace des traits de progression a besoin de `getTotalLength()`, qui
		// suppose le SVG deja mis en page : ca, en revanche, peut attendre un frame
		// sans creer de flash visible (ce sont de simples traits qui se dessinent).
		requestAnimationFrame(() => {
			if (this.destroyed) return;
			for (const path of Array.from(svg.querySelectorAll<SVGPathElement>(".svg-path.active"))) {
				const length = path.getTotalLength();
				this.track(
					gsap.fromTo(
						path,
						{ strokeDasharray: length, strokeDashoffset: length },
						{ strokeDashoffset: 0, duration: 0.6, ease: "power2.inOut", delay: 0.35 },
					),
				);
			}
		});
	}

	/**
	 * Etape VS, dans la MEME popup que le bracket (juste un `@if` interne qui
	 * bascule le contenu, cf. template) : "Toi" et l'adversaire glissent
	 * l'un vers l'autre, le badge VS "impacte" au centre, puis un vrai
	 * decompte 3-2-1-FIGHT joue un chiffre a la fois (superposes, pas alignes
	 * en ligne comme avant). Si un event est actif, sa banniere fait irruption
	 * juste apres, avec un flash. Le bouton "Drafter !" ne s'affiche qu'une
	 * fois cette timeline terminee (voir drafterReady) : sinon un clic rapide
	 * saute la lecture de l'event avant meme d'avoir eu le temps de le voir.
	 */
	/** Timeline + delayedCall de l'etape VS courante : tues explicitement a chaque nouvel appel pour ne jamais laisser une instance perimee "orpheline" avec un callback qui ne se declenchera jamais. */
	private vsRevealTimeline: gsap.core.Timeline | null = null;
	private vsRevealReadyCall: gsap.core.Tween | null = null;

	private animateVsReveal(): void {
		if (this.destroyed) return;
		this.drafterReady.set(false);
		const stage = document.querySelector(".vs-reveal-inline");
		if (!stage) {
			// Le contenu du popup vient de basculer bracket -> vs : Angular n'a
			// peut-etre pas encore peint cette partie. On retente au prochain frame.
			requestAnimationFrame(() => this.animateVsReveal());
			return;
		}

		// Toute instance precedente est tuee explicitement (pas juste ses tweens
		// enfants via killTweensOf) : sinon un appel repete (ex. cet effect qui
		// se redeclenche a cause d'un signal sans rapport) laissait une ancienne
		// timeline tourner en parallele avec un `.call()` de fin qui ne se
		// declenchait jamais de facon fiable.
		this.vsRevealTimeline?.kill();
		this.vsRevealReadyCall?.kill();

		const you = stage.querySelector(".vs-side.you");
		const opponent = stage.querySelector(".vs-side.opponent");
		const core = stage.querySelector(".vs-core");
		const steps = stage.querySelectorAll<HTMLElement>(".countdown-step");
		const eventBanner = stage.querySelector(".event-reveal");

		// Masquer tout de suite (meme tick, avant tout paint) : voir le meme
		// commentaire dans animateBracketReveal sur le flash "apparait/disparait".
		if (you) gsap.set(you, { x: -90, opacity: 0 });
		if (opponent) gsap.set(opponent, { x: 90, opacity: 0 });
		if (core) gsap.set(core, { scale: 0, opacity: 0 });
		if (steps.length) gsap.set(steps, { opacity: 0 });
		if (eventBanner) gsap.set(eventBanner, { y: -70, opacity: 0, scale: 0.85 });

		const tl = gsap.timeline();
		this.vsRevealTimeline = tl;
		tl.call(() => this.audio.play("whoosh", { volume: 0.6 }), undefined, 0);
		if (you) tl.to(you, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0);
		if (opponent) tl.to(opponent, { x: 0, opacity: 1, duration: 0.5, ease: "power3.out" }, 0);
		if (core) {
			tl.to(core, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(3)" }, 0.15).to(
				core,
				{ filter: "brightness(1.6)", duration: 0.15, yoyo: true, repeat: 1 },
				0.15,
			);
			tl.call(() => this.audio.play("impact", { volume: 0.5 }), undefined, 0.15);
		}

		// Decompte 3-2-1-FIGHT : un "tick" sonore par chiffre, puis un "go" plus
		// marque sur FIGHT (jamais l'inverse — le go doit clairement se detacher
		// des ticks reguliers qui le precedent).
		let cursor = 0.65;
		steps.forEach((step) => {
			const isFight = step.classList.contains("fight");
			tl.call(
				() =>
					this.audio.play(isFight ? "countdown-go" : "countdown-tick", {
						volume: isFight ? 0.75 : 0.55,
					}),
				undefined,
				cursor,
			);
			tl.fromTo(
				step,
				{ opacity: 0, scale: isFight ? 1.6 : 2.4, rotate: isFight ? 0 : -6 },
				{ opacity: 1, scale: 1, rotate: 0, duration: 0.22, ease: "back.out(2.4)" },
				cursor,
			);
			if (!isFight) {
				tl.to(step, { opacity: 0, scale: 0.55, duration: 0.18, ease: "power1.in" }, cursor + 0.34);
			}
			cursor += isFight ? 0 : 0.44;
		});

		if (eventBanner) {
			const start = cursor + 0.35;
			tl.to(
				eventBanner,
				{ y: 0, opacity: 1, scale: 1, duration: 0.5, ease: "back.out(2.2)" },
				start,
			).to(
				eventBanner,
				{ boxShadow: "0 0 60px rgba(255,255,255,.4)", duration: 0.3, yoyo: true, repeat: 1 },
				start + 0.45,
			);
			cursor = start + 0.9;
		}

		// Le bouton "Drafter !" n'apparait qu'une fois la sequence (countdown +
		// event eventuel) terminee : sinon un clic rapide saute tout ca avant
		// meme d'avoir pu le lire. Decouple de la timeline (gsap.delayedCall,
		// pas tl.call) : un pur delai en temps reel, jamais bloque par une
		// eventuelle re-entree qui tuerait la timeline en cours de route.
		this.vsRevealReadyCall = gsap.delayedCall(cursor + 0.2, () => this.drafterReady.set(true));
	}

	/** Clic sur "Drafter !" : impact/onde de choc + fondu de toute la popup avant de basculer sur l'ecran de pick, plutot qu'un simple flash blanc plat. */
	confirmDrafter(): void {
		if (this.matchTransitioning() || !this.drafterReady()) return;
		this.matchTransitioning.set(true);
		this.animateDrafterTransition(() => {
			this.matchTransitioning.set(false);
			this.revealMatchup();
		});
	}

	private animateDrafterTransition(onComplete: () => void): void {
		const modal = document.querySelector(".auto-bracket-dialog");
		if (!modal) {
			onComplete();
			return;
		}
		const flash = modal.querySelector(".transition-flash");
		gsap.killTweensOf([modal, flash].filter(Boolean) as Element[]);
		if (flash) gsap.set(flash, { opacity: 0, scale: 0.15 });

		// Trackee : son onComplete declenche revealMatchup() — jamais apres destroy.
		const tl = this.track(gsap.timeline({ onComplete }));
		// Petit recul avant l'impact, comme un "chargement" du coup.
		tl.to(modal, { scale: 0.985, duration: 0.14, ease: "power1.in" })
			// Impact : secousse breve + onde de choc qui explose depuis le centre.
			.to(modal, { x: -7, duration: 0.045 })
			.to(modal, { x: 7, duration: 0.045 })
			.to(modal, { x: -4, duration: 0.045 })
			.to(modal, { x: 0, duration: 0.045 })
			.to(modal, { scale: 1.015, duration: 0.16, ease: "power2.out" }, "<")
			// Fondu/flou final vers l'ecran de pick.
			.to(modal, { opacity: 0.1, scale: 0.96, filter: "blur(10px)", duration: 0.85, ease: "power2.in" }, "+=0.25");

		if (flash) {
			tl.to(flash, { opacity: 0.92, scale: 1.5, duration: 0.32, ease: "power2.out" }, 0.14).to(
				flash,
				{ opacity: 0, scale: 2.1, duration: 0.6, ease: "power1.in" },
				0.42,
			);
		}
	}

	/**
	 * Popup de victoire finale du tournoi : le champion "spawn" en spotlight
	 * (fanfare + particules dorees), puis le classement arrive en cascade.
	 * Joue une seule fois a l'ouverture (cf. showFinalRecap/finalRecapAnimated).
	 */
	private animateFinalRecap(): void {
		requestAnimationFrame(() => {
			if (this.destroyed) return;
			const popup = document.querySelector<HTMLElement>(".final-popup");
			if (!popup) return;

			const spotlight = popup.querySelector(".champion-spotlight");
			const crown = popup.querySelector(".champion-spotlight .crown");
			const rows = popup.querySelectorAll(".placement-row");
			const footer = popup.querySelector(".final-popup-footer");
			const points = popup.querySelectorAll<HTMLElement>(".pts-num");

			gsap.killTweensOf([spotlight, crown, rows, footer].filter(Boolean) as Element[]);

			// Les points partent de 0 AVANT le premier paint du popup : le count-up
			// (lance plus bas, une fois les rangees posees) ne doit jamais laisser
			// entrevoir la valeur finale une fraction de seconde.
			points.forEach((el) => (el.textContent = "0"));

			this.audio.play("fanfare", { volume: 0.85 });

			const tl = this.track(gsap.timeline());
			if (spotlight) {
				tl.from(spotlight, {
					opacity: 0,
					scale: 0.35,
					y: 40,
					duration: 0.7,
					ease: "back.out(1.9)",
				});
				tl.call(
					() =>
						burstParticles(popup, {
							colors: ["#c8aa6e", "#f0e6d2", "#fff6dc"],
							count: 56,
							origin: { x: popup.clientWidth / 2, y: popup.clientHeight * 0.32 },
						}),
					undefined,
					"<",
				);
			}
			if (crown) {
				tl.from(crown, { scale: 0, rotate: -35, duration: 0.5, ease: "back.out(3)" }, "<0.1");
			}
			if (rows.length) {
				tl.from(
					rows,
					{ opacity: 0, y: 16, duration: 0.35, stagger: 0.07, ease: "power2.out" },
					"-=0.15",
				);
			}
			// Count-up des points de chaque placement une fois les rangees posees
			// (helper partage cinematic.ts) : la cible est portee par data-target.
			if (points.length) {
				tl.call(
					() => {
						if (this.destroyed) return;
						points.forEach((el) =>
							countUp(el, Number(el.dataset["target"]) || 0, { duration: 0.9 }),
						);
					},
					undefined,
					"-=0.05",
				);
			}
			if (footer) {
				tl.from(footer, { opacity: 0, y: 10, duration: 0.3, ease: "power1.out" }, "-=0.1");
			}
		});
	}

	/**
	 * Reveal du vainqueur en mode simple (duel 1v1, sans bracket) : fanfare +
	 * particules dorees sur la carte du gagnant, puis les cartes de resultat
	 * arrivent en cascade. Meme esprit que animateFinalRecap, adapte a
	 * `app-draft-result` (une carte par joueur, triee, la premiere = vainqueur).
	 */
	private animateSimpleResults(): void {
		requestAnimationFrame(() => {
			if (this.destroyed) return;
			const stage = document.querySelector<HTMLElement>(".results-stage");
			if (!stage) return;
			const title = stage.querySelector(".stage-title");
			const cards = stage.querySelectorAll<HTMLElement>("app-draft-result .result");
			const winnerCard = stage.querySelector<HTMLElement>("app-draft-result .result.winner");
			const totals = stage.querySelectorAll<HTMLElement>("app-draft-result .total-num");

			gsap.killTweensOf([title, ...Array.from(cards)].filter(Boolean) as Element[]);

			// Comme dans animateFinalRecap : scores a 0 avant le premier paint,
			// pour que le count-up ne laisse pas flasher la valeur finale.
			totals.forEach((el) => (el.textContent = "0"));

			this.audio.play("fanfare", { volume: 0.85 });

			const tl = this.track(gsap.timeline());
			if (title) tl.from(title, { opacity: 0, y: -16, duration: 0.4, ease: "power2.out" });
			if (cards.length) {
				tl.from(
					cards,
					{ opacity: 0, y: 24, scale: 0.96, duration: 0.45, stagger: 0.1, ease: "back.out(1.6)" },
					"-=0.1",
				);
			}
			// Count-up GSAP des scores une fois les cartes posees (helper partage).
			if (totals.length) {
				tl.call(
					() => {
						if (this.destroyed) return;
						totals.forEach((el) =>
							countUp(el, Number(el.dataset["target"]) || 0, { duration: 1 }),
						);
					},
					undefined,
					"-=0.1",
				);
			}
			if (winnerCard) {
				tl.call(
					() =>
						burstParticles(winnerCard, {
							colors: ["#c8aa6e", "#f0e6d2", "#0ac8b9"],
							count: 40,
						}),
					undefined,
					"-=0.15",
				);
			}
		});
	}

	totalSteps = computed(
		() => this.roles.length + this.draft.strategyCategories().length,
	);
	/** Juste pour boucler dans le template : un index par etape (role + strategie), pour le mini indicateur de progression. */
	stepIndices = computed(() => Array.from({ length: this.totalSteps() }, (_, i) => i));
	isStrategyStep = computed(() => this.currentIndex() >= this.roles.length);
	currentRole = computed(
		() => this.roles[this.currentIndex()] ?? this.roles[this.roles.length - 1],
	);
	currentStrategyCategory = computed(
		() =>
			this.draft.strategyCategories()[this.currentIndex() - this.roles.length],
	);
	picked = computed(
		() => Object.values(this.picksByRole()).filter(Boolean) as Champion[],
	);
	spent = computed(() => this.picked().reduce((sum, c) => sum + c.cost, 0));
	/**
	 * Budget/event de CE duel precis : en tournoi, chaque match tire le sien
	 * independamment (voir backend DraftMatchState/RoundMatchup — un event
	 * special peut tomber sur UN duel d'un round sans toucher aux autres, ni
	 * aux rounds suivants). En mode simple, un seul tirage vaut pour toute la
	 * partie (`draft.budget()`/`draft.event()`), il n'y a qu'un duel en tout.
	 */
	currentBudget = computed(() =>
		this.isTournament() ? (this.displayedMatchup()?.budget ?? this.draft.budget()) : this.draft.budget(),
	);
	currentEvent = computed<DraftEvent | null>(() =>
		this.isTournament() ? (this.displayedMatchup()?.event ?? null) : this.draft.event(),
	);
	remaining = computed(() => this.currentBudget() - this.spent());
	rerollsLeft = computed(() => this.maxRerolls - this.rerollsUsed());
	allChampionsPicked = computed(() =>
		this.roles.every((role) => !!this.pickFor(role)),
	);
	allStrategySelected = computed(() => {
		const categories = this.draft.strategyCategories();
		if (!categories.length) return true;
		const selections = this.strategySelections();
		return categories.every((category) => !!selections[category.id]);
	});
	/** Mes choix de strategie (augments/poke/teamfight...), pour les garder visibles apres la phase de pick (attente, HUD). */
	mySelectedStrategyTags = computed(() => this.strategyTagsFor(this.strategySelections()));

	/** Meme resolution que mySelectedStrategyTags, mais pour n'importe quelle selection (utilise pour l'avancement en direct d'un adversaire regarde en spectateur). */
	strategyTagsFor(selections: StrategySelections | undefined): { icon: IconName; label: string }[] {
		if (!selections) return [];
		const tags: { icon: IconName; label: string }[] = [];
		for (const category of this.draft.strategyCategories()) {
			const optionId = selections[category.id];
			const option = category.options.find((o) => o.id === optionId);
			if (option) tags.push({ icon: this.strategyIcon(option.id), label: option.label });
		}
		return tags;
	}

	// ---- mode simple (< 4 joueurs, sans bracket) ----
	protected readonly cinematicStep = signal(0);
	protected readonly showFinalResults = signal(false);
	protected readonly submittedToMix = signal(false);

	duelPlayerA = computed<DraftResult | undefined>(() => {
		if (this.isTournament()) return undefined;
		const results = this.draft.results();
		return results ? this.sortedResults(results)[0] : undefined;
	});
	duelPlayerB = computed<DraftResult | undefined>(() => {
		if (this.isTournament()) return undefined;
		const results = this.draft.results();
		return results ? this.sortedResults(results)[1] : undefined;
	});

	// ---- mode tournoi (4+ joueurs) ----
	protected readonly viewingMatchKey = signal<string | null>(null);
	protected readonly hasSeenMyResult = signal(false);
	protected readonly bracketRevealDone = signal(false);
	protected readonly matchupRevealDone = signal(false);
	/** Vrai pendant le petit flash/fondu joue apres le clic sur "Drafter !", avant de rejoindre l'ecran de pick. */
	protected readonly matchTransitioning = signal(false);
	/** Vrai une fois la sequence VS (glissement + decompte + event eventuel) terminee : le bouton "Drafter !" n'apparait qu'a ce moment-la. */
	protected readonly drafterReady = signal(false);
	/**
	 * Le matchup affiche localement : peut retarder par rapport a
	 * `draft.myMatchup()` (deja avance cote serveur) tant que je n'ai pas fini
	 * de regarder mon propre resultat du round precedent — sinon un round qui
	 * se termine trop vite (adversaires bots instantanes) sauterait direct au
	 * round suivant sans jamais me montrer mon match.
	 */
	protected readonly displayedMatchup = signal<RoundMatchup | null>(null);
	private lastAppliedRound: number | null = null;
	private bracketDialogWasOpen = false;
	private vsStepWasOpen = false;
	private finalRecapAnimated = false;
	/** Idem finalRecapAnimated, mais pour le reveal du vainqueur en mode simple (< 4 joueurs, sans bracket). */
	private simpleResultsAnimated = false;

	isTournament = computed(() => !!this.draft.tournamentProgress());
	myMatchKey = computed<string | null>(() => {
		const m = this.displayedMatchup();
		return m ? `${m.round}-${m.matchIndex}` : null;
	});
	myResolvedMatch = computed<DraftMatchState | undefined>(() => {
		const key = this.myMatchKey();
		return key ? this.draft.resolvedMatches().get(key) : undefined;
	});
	/** Une fois elimine, je ne recevrai plus jamais de nouveau matchup : mon affichage local reste fige sur mon dernier round joue. */
	amIEliminated = computed(() => {
		const match = this.myResolvedMatch();
		const myId = this.room.myId();
		return !!match && match.status === "resolved" && match.winnerId !== myId;
	});
	currentRoundMatches = computed<DraftMatchState[]>(() => {
		const progress = this.draft.tournamentProgress();
		if (!progress) return [];
		// Elimine : suit le round en direct (spectateur) plutot que de rester bloque sur mon dernier round joue.
		const round = this.amIEliminated()
			? progress.currentRound
			: this.displayedMatchup()?.round;
		if (round == null) return [];
		return progress.rounds.find((r) => r.round === round)?.matches ?? [];
	});
	roundFullyResolved = computed(() => {
		const matches = this.currentRoundMatches();
		return matches.length > 0 && matches.every((m) => m.status === "resolved");
	});
	tournamentChampionId = computed(
		() => this.draft.tournamentProgress()?.championId,
	);
	/**
	 * Comme pour la transition de round, ne jamais sauter la cinematique de
	 * MON dernier match sous pretexte que le tournoi entier vient de se
	 * terminer en meme temps (cas frequent en finale : mon match = le
	 * dernier du tournoi).
	 */
	showFinalRecap = computed<string | undefined>(() => {
		const championId = this.tournamentChampionId();
		if (!championId) return undefined;
		if (this.displayedMatchup() && !this.hasSeenMyResult()) return undefined;
		return championId;
	});
	/** Le match affiche dans le visualiseur : le mien par defaut, ou un autre si je choisis de le spec. */
	viewedMatch = computed<DraftMatchState | undefined>(() => {
		const key = this.viewingMatchKey() ?? this.myMatchKey();
		return key ? this.draft.resolvedMatches().get(key) : undefined;
	});
	isViewingMyMatch = computed(
		() => (this.viewingMatchKey() ?? this.myMatchKey()) === this.myMatchKey(),
	);
	/** Meta du match affiche meme s'il n'est pas encore resolu (pour afficher "en attente de X vs Y"). */
	viewedMatchMeta = computed<DraftMatchState | undefined>(() => {
		const key = this.viewingMatchKey() ?? this.myMatchKey();
		if (!key) return undefined;
		return (
			this.draft.resolvedMatches().get(key) ??
			this.currentRoundMatches().find(
				(m) => `${m.round}-${m.matchIndex}` === key,
			)
		);
	});
	/** Avancement en direct des picks + strategie du match regarde (tant qu'il n'est pas resolu) : spectateur "live". */
	viewedMatchProgress = computed<
		| {
				a?: { picks: Partial<Record<Role, string>>; strategySelections?: StrategySelections };
				b?: { picks: Partial<Record<Role, string>>; strategySelections?: StrategySelections };
		  }
		| undefined
	>(() => {
		const meta = this.viewedMatchMeta();
		const key = this.viewingMatchKey() ?? this.myMatchKey();
		if (!meta || !key) return undefined;
		const progress = this.draft.liveDraftProgress().get(key);
		if (!progress) return undefined;
		return { a: progress[meta.playerAId], b: progress[meta.playerBId] };
	});

	/** Le scenario de match (genere cote serveur, deterministe) pour le duel affiche. */
	currentScenario = computed<MatchScenario | undefined>(() => {
		if (this.isTournament()) return this.viewedMatch()?.scenario;
		return this.duelPlayerA()?.scenario ?? this.duelPlayerB()?.scenario;
	});
	currentPhase = computed<ScenarioPhase | undefined>(
		() => this.currentScenario()?.phases[this.cinematicStep()],
	);
	/** cote 'A' du scenario == playerA du match affiche (ou duelPlayerA en mode simple). */
	phaseWinnerPlayerId = computed<string | undefined>(() => {
		const phase = this.currentPhase();
		if (!phase) return undefined;
		if (this.isTournament()) {
			const match = this.viewedMatch();
			return match
				? phase.favors === "A"
					? match.playerAId
					: match.playerBId
				: undefined;
		}
		return phase.favors === "A"
			? this.duelPlayerA()?.playerId
			: this.duelPlayerB()?.playerId;
	});
	phaseLoserPlayerId = computed<string | undefined>(() => {
		const phase = this.currentPhase();
		if (!phase) return undefined;
		if (this.isTournament()) {
			const match = this.viewedMatch();
			return match
				? phase.favors === "A"
					? match.playerBId
					: match.playerAId
				: undefined;
		}
		return phase.favors === "A"
			? this.duelPlayerB()?.playerId
			: this.duelPlayerA()?.playerId;
	});

	constructor(
		protected readonly draft: DraftService,
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		private readonly audio: AudioService,
	) {
		effect(() => {
			const incoming = this.draft.myMatchup();
			const tournamentActive = this.isTournament();
			const seenMyResult = this.hasSeenMyResult();
			if (
				tournamentActive &&
				incoming &&
				incoming.round !== this.lastAppliedRound
			) {
				// Un round qui se termine tres vite (adversaires bots quasi instantanes)
				// ne doit jamais me faire sauter au round suivant avant que j'aie
				// vu mon propre resultat : on retarde l'application du nouveau
				// matchup tant que `hasSeenMyResult` n'est pas passe a true.
				const readyToAdvance = this.lastAppliedRound === null || seenMyResult;
				if (readyToAdvance) {
					this.lastAppliedRound = incoming.round;
					this.displayedMatchup.set(incoming);
					this.resetPickState();
					this.viewingMatchKey.set(null);
					this.hasSeenMyResult.set(false);
					this.bracketRevealDone.set(false);
					this.matchupRevealDone.set(false);
					this.cinematicStep.set(0);
				}
			}
			if (!tournamentActive && !this.draft.results()) {
				this.cinematicStep.set(0);
				this.showFinalResults.set(false);
			}
		});

		effect(() => {
			const pool = this.draft.championsPool();
			const role = this.currentRole();
			if (pool.length && this.offers().length === 0 && !this.isStrategyStep()) {
				this.refreshOffers(role);
			}
		});

		effect(() => {
			if (this.offers().length) this.animateOffersEntrance();
		});

		effect(() => {
			if (
				this.isTournament() &&
				this.tournamentChampionId() &&
				this.mix.active()
			) {
				this.submitDraftMix();
			}
		});

		effect(() => {
			// Ne joue l'entree qu'au moment ou le dialog s'ouvre (transition
			// ferme -> ouvert), jamais a chaque changement de `tournamentProgress`
			// pendant qu'il reste ouvert : des bots qui resolvent leurs matchs
			// quasi instantanement redeclenchaient l'effect en rafale, ce qui
			// tuait/relancait la timeline en boucle et laissait tout foge a
			// l'etat de depart (opacite 0).
			const isOpen = this.isTournament() && !this.bracketRevealDone();
			if (isOpen && !this.bracketDialogWasOpen) {
				this.animateBracketReveal();
			}
			this.bracketDialogWasOpen = isOpen;
		});

		effect(() => {
			// Meme logique de "flanc montant" : l'etape VS (dans la meme popup,
			// juste apres le bracket) ne doit animer son entree qu'une fois par
			// ouverture, pas a chaque recalcul pendant qu'elle reste affichee.
			const isVsOpen = this.isTournament() && this.bracketRevealDone() && !this.matchupRevealDone();
			// `finally` : si animateVsReveal() devait lancer une exception (GSAP,
			// DOM absent...), vsStepWasOpen doit quand meme se mettre a jour.
			// Sinon il reste bloque sur son ancienne valeur et CE effect se
			// remet a rappeler animateVsReveal() en boucle des qu'un signal sans
			// rapport (ex. un bot qui resout un autre match du bracket) le fait
			// se re-evaluer — chaque appel tuant la timeline du precedent avant
			// que son `.call()` de fin (qui revele le bouton Drafter) n'ait eu la
			// moindre chance de se declencher.
			try {
				if (isVsOpen && !this.vsStepWasOpen) {
					this.animateVsReveal();
				}
			} finally {
				this.vsStepWasOpen = isVsOpen;
			}
		});

		effect(() => {
			// Meme logique de "flanc montant" que le dialog bracket : la popup de
			// victoire ne doit spawn qu'une fois, pas a chaque recalcul.
			if (this.showFinalRecap() && !this.finalRecapAnimated) {
				this.finalRecapAnimated = true;
				this.animateFinalRecap();
			}
		});

		effect(() => {
			// Reveal du vainqueur en mode simple (< 4 joueurs, sans bracket) :
			// meme traitement fanfare + particules que le recap de tournoi, cf.
			// animateFinalRecap. Ne joue qu'une fois par partie.
			if (
				!this.isTournament() &&
				this.isSingleRevealed() &&
				!this.simpleResultsAnimated
			) {
				this.simpleResultsAnimated = true;
				this.animateSimpleResults();
			}
		});

		// Filet de securite : si ce composant se monte apres coup (ou si l'onglet
		// revient au premier plan apres avoir ete mis en veille par le
		// navigateur), on redemande l'etat plutot que de risquer de rester
		// bloque sur un bracket/matchup perime ou vide.
		this.draft.requestState();
		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") this.draft.requestState();
		};
		document.addEventListener("visibilitychange", onVisibilityChange);
		inject(DestroyRef).onDestroy(() => {
			document.removeEventListener("visibilitychange", onVisibilityChange);
		});
	}

	private resetPickState(): void {
		this.picksByRole.set({});
		this.currentIndex.set(0);
		this.offers.set([]);
		this.strategySelections.set({});
		this.rerollsUsed.set(0);
		this.submitted.set(false);
		this.confirmingStep.set(false);
	}

	roleLabel(role: Role): string {
		return ROLE_LABEL[role];
	}
	initials(champion: Champion): string {
		return champion.name
			.split(/\s|-|'/)
			.map((w) => w[0])
			.join("")
			.slice(0, 2)
			.toUpperCase();
	}
	splash(id: string): string {
		return championSplashUrl(id);
	}
	icon(id: string): string {
		return championSquareUrl(id);
	}
	championName(id: string): string {
		return this.draft.championsPool().find((c) => c.id === id)?.name ?? id;
	}
	pseudoOf(playerId: string): string {
		if (isCloneId(playerId)) {
			const sourceId = cloneSourceOf(playerId);
			return `Clone de ${sourceId ? this.realPseudoOf(sourceId) : "?"}`;
		}
		return this.realPseudoOf(playerId);
	}
	private realPseudoOf(playerId: string): string {
		if (playerId === this.room.myId()) return "Toi";
		return (
			this.room.players().find((p) => p.id === playerId)?.pseudo ?? "Joueur"
		);
	}
	resultFor(playerId: string | undefined): DraftResult | undefined {
		if (!playerId) return undefined;
		return this.draft.results()?.find((r) => r.playerId === playerId);
	}

	// ---- tournoi : bracket / round / matchups ----

	roundLabelForState(round: TournamentRoundState): string {
		return round.matches.length === 1 ? "Finale" : `Tour ${round.round}`;
	}
	isMyMatch(match: DraftMatchState): boolean {
		const myId = this.room.myId();
		return match.playerAId === myId || match.playerBId === myId;
	}
	matchStatusLabel(match: DraftMatchState): string {
		return match.status === "resolved" ? "Termine" : "En cours de draft";
	}
	selectViewing(match: DraftMatchState): void {
		this.cinematicStep.set(0);
		this.viewingMatchKey.set(`${match.round}-${match.matchIndex}`);
	}
	/** Un autre match du round courant que je peux regarder (en priorite un qui n'est pas encore resolu, pour du "live"). */
	otherMatchToSpectate = computed<DraftMatchState | undefined>(() => {
		const others = this.currentRoundMatches().filter((m) => !this.isMyMatch(m));
		return others.find((m) => m.status !== "resolved") ?? others[0];
	});
	/** Bouton explicite depuis l'ecran de defaite : bascule vers un match d'un autre joueur plutot que de rester bloque a attendre. */
	spectateAnotherMatch(): void {
		const target = this.otherMatchToSpectate();
		if (target) this.selectViewing(target);
	}
	revealBracket(): void {
		this.bracketRevealDone.set(true);
	}
	revealMatchup(): void {
		this.matchupRevealDone.set(true);
	}
	placements(): { playerId: string; tag: string; points: number }[] {
		const progress = this.draft.tournamentProgress();
		if (!progress || !progress.championId) return [];
		const allMatches = progress.rounds.flatMap((r) => r.matches);
		const winsByPlayer = new Map<string, number>();
		for (const match of allMatches) {
			if (match.winnerId && !isCloneId(match.winnerId)) {
				winsByPlayer.set(
					match.winnerId,
					(winsByPlayer.get(match.winnerId) ?? 0) + 1,
				);
			}
		}
		const participantIds = new Set<string>();
		for (const match of allMatches) {
			participantIds.add(match.playerAId);
			if (!match.isCloneMatch) participantIds.add(match.playerBId);
		}
		return Array.from(participantIds)
			.map((playerId) => {
				const wins = winsByPlayer.get(playerId) ?? 0;
				const isChampion = playerId === progress.championId;
				const eliminationIndex = allMatches.findIndex(
					(m) =>
						(m.playerAId === playerId || m.playerBId === playerId) &&
						m.winnerId !== playerId,
				);
				const tag = isChampion
					? "Vainqueur du tournoi"
					: eliminationIndex === -1
						? "Participant"
						: `Elimine (${wins} victoire${wins > 1 ? "s" : ""})`;
				return {
					playerId,
					tag,
					points: isChampion ? 100 : Math.max(5, wins * 20),
				};
			})
			.sort((a, b) => b.points - a.points);
	}

	matchLabel(): string {
		if (!this.isTournament()) return "Simulation de game";
		const match = this.viewedMatch();
		if (!match) return "Simulation de game";
		const round = this.draft
			.tournamentProgress()
			?.rounds.find((r) => r.round === match.round);
		const label = round
			? this.roundLabelForState(round)
			: `Tour ${match.round}`;
		if (this.isViewingMyMatch()) return `${label} · Ton match`;
		return `${label} · ${this.pseudoOf(match.playerAId)} vs ${this.pseudoOf(match.playerBId)}`;
	}
	phaseKindLabel(kind: ScenarioPhaseKind): string {
		switch (kind) {
			case "lane":
				return "Duel de lane";
			case "skirmish":
				return "Escarmouche";
			case "objective":
				return "Objectif";
			case "teamfight":
				return "Teamfight";
			case "macro":
				return "Macro";
		}
	}
	nextButtonLabel(): string {
		const phaseCount = this.currentScenario()?.phases.length ?? 1;
		if (this.cinematicStep() < phaseCount - 1) return "Phase suivante";
		if (this.isTournament())
			return this.isViewingMyMatch() ? "Voir le resultat" : "Revenir au hub";
		return "Afficher le resultat final";
	}

	pickFor(role: Role): Champion | undefined {
		return this.picksByRole()[role];
	}

	canPick(champion: Champion): boolean {
		if (!champion.roles.includes(this.currentRole())) return false;
		const previous = this.pickFor(this.currentRole());
		const refunded = previous ? previous.cost : 0;
		return champion.cost <= this.remaining() + refunded;
	}

	pick(champion: Champion): void {
		if (this.isStrategyStep() || this.confirmingStep()) return;
		if (!this.canPick(champion)) {
			this.shakeLockedCard(champion.id);
			return;
		}
		const role = this.currentRole();
		this.picksByRole.update((picks) => ({ ...picks, [role]: champion }));
		if (this.isTournament()) {
			const byRole: Partial<Record<Role, string>> = {};
			for (const [r, c] of Object.entries(this.picksByRole()))
				byRole[r as Role] = c?.id;
			this.draft.reportDraftProgress(byRole, this.strategySelections());
		}
		this.confirmingStep.set(true);
		this.playPickConfirm(champion.id, () => {
			this.advanceStep();
			this.confirmingStep.set(false);
		});
	}

	/** Tilt de la carte suivant la position du curseur (effet "carte a collectionner"). */
	onPickCardMove(event: MouseEvent): void {
		const card = event.currentTarget as HTMLElement;
		const rect = card.getBoundingClientRect();
		const px = (event.clientX - rect.left) / rect.width - 0.5;
		const py = (event.clientY - rect.top) / rect.height - 0.5;
		gsap.to(card, {
			rotateY: px * 14,
			rotateX: -py * 14,
			transformPerspective: 800,
			duration: 0.4,
			ease: "power2.out",
			overwrite: "auto",
		});
	}

	onPickCardLeave(event: MouseEvent): void {
		gsap.to(event.currentTarget as HTMLElement, {
			rotateY: 0,
			rotateX: 0,
			duration: 0.5,
			ease: "elastic.out(1, 0.6)",
			overwrite: "auto",
		});
	}

	/** Petit pulse de confirmation avant de passer au role/etape suivant. */
	private playPickConfirm(championId: string, onComplete: () => void): void {
		this.playConfirmPulse(`.pick-card[data-champ-id="${championId}"]`, onComplete);
	}

	/** Petit pulse d'echelle joue avant de valider un choix (champion ou carte de strategie). */
	private playConfirmPulse(selector: string, onComplete?: () => void): void {
		this.audio.play("ui-click", { volume: 0.6 });
		const el = document.querySelector<HTMLElement>(selector);
		if (!el) {
			onComplete?.();
			return;
		}
		// Trackee : son onComplete fait avancer l'etape de pick (advanceStep) —
		// jamais apres destroy.
		this.track(gsap.timeline({ onComplete }))
			.to(el, { scale: 1.07, duration: 0.12, ease: "power2.out" })
			.to(el, { scale: 1, duration: 0.2, ease: "power1.inOut", clearProps: "scale" });
	}

	private shakeLockedCard(championId: string): void {
		this.audio.play("wrong", { volume: 0.35 });
		const card = document.querySelector<HTMLElement>(`.pick-card[data-champ-id="${championId}"]`);
		if (!card) return;
		gsap.fromTo(card, { x: -6 }, { x: 0, duration: 0.4, ease: "elastic.out(1, 0.3)", clearProps: "x" });
	}

	/**
	 * Entree en cascade 3D des cartes a chaque fois que les offres changent
	 * (nouveau role, reroll) : les 3 offres "atterrissent" une a une depuis le
	 * haut, avec un rebond marque et un impact sonore/visuel a chaque poser
	 * (whoosh au depart, impact + flash de bordure au contact) plutot qu'un
	 * simple fondu — le moment ou l'offre est revelee doit se sentir.
	 */
	private animateOffersEntrance(): void {
		requestAnimationFrame(() => {
			if (this.destroyed) return;
			const cards = document.querySelectorAll<HTMLElement>(".pick-card");
			if (!cards.length) return;
			gsap.killTweensOf(cards);
			this.audio.play("whoosh", { volume: 0.55 });
			const tl = this.track(gsap.timeline());
			tl.from(cards, {
				opacity: 0,
				y: -90,
				scale: 0.82,
				rotateX: -22,
				rotateZ: () => gsap.utils.random(-6, 6),
				transformPerspective: 800,
				duration: 0.62,
				stagger: 0.14,
				ease: "back.out(1.7)",
				// IMPORTANT : ne jamais utiliser clearProps:"all" ici. Les cartes
				// portent aussi la variable CSS inline --rarity-color (via
				// [style.--rarity-color] dans le template) : "all" efface TOUT le
				// style inline une fois l'animation finie, y compris cette
				// variable, ce qui faisait retomber silencieusement chaque carte
				// sur la couleur de repli (dore) — la rarete redevenait invisible
				// des que l'entree etait terminee. On ne nettoie donc que les
				// props ecrites par CETTE tween.
				clearProps: "opacity,transform,rotationX,rotationZ,perspective",
			});
			cards.forEach((card, i) => {
				tl.call(
					() => {
						this.audio.play("impact", { volume: 0.32, rate: 1.15 });
						gsap.fromTo(
							card,
							{ filter: "brightness(1.8)" },
							{ filter: "brightness(1)", duration: 0.35, ease: "power2.out" },
						);
					},
					undefined,
					i * 0.14 + 0.5,
				);
			});
		});
	}

	private advanceStep(): void {
		if (this.currentIndex() >= this.totalSteps() - 1) return;
		this.currentIndex.update((i) => i + 1);
		if (!this.isStrategyStep())
			this.refreshOffers(this.roles[this.currentIndex()]);
	}

	reroll(): void {
		if (this.rerollsLeft() <= 0) return;
		this.audio.play("swap", { volume: 0.6 });
		this.rerollsUsed.update((n) => n + 1);
		this.refreshOffers(this.currentRole());
	}

	/** Ordre croissant : sert au repli progressif des events "*-only" quand une rarete n'a pas assez de champions sur un role. */
	private static readonly RARITY_ORDER: ChampionRarity[] = [
		"gratuit",
		"commun",
		"rare",
		"tres-rare",
		"epique",
		"legendaire",
		"mythique",
	];

	protected isSbire(champion: Champion): boolean {
		return champion.rarity === "gratuit";
	}

	refreshOffers(role: Role): void {
		const alreadyPicked = new Set(this.picked().map((c) => c.id));
		const rolePool = this.draft
			.championsPool()
			.filter((c) => c.roles.includes(role) && !alreadyPicked.has(c.id));

		let pool = rolePool.filter((c) => !this.isSbire(c));

		const event = this.currentEvent();
		const minRarity = event === "mythique-only" ? "mythique" : event === "legendaire-only" ? "legendaire" : null;
		if (minRarity) {
			const order = DraftBattleComponent.RARITY_ORDER;
			let floor = order.indexOf(minRarity);
			// Repli progressif vers des raretes plus communes si le role n'a pas assez de champions au palier demande (ex. seulement 2 mythiques au total).
			while (floor > 0 && pool.filter((c) => order.indexOf(c.rarity) >= floor).length < 3) floor -= 1;
			pool = pool.filter((c) => order.indexOf(c.rarity) >= floor);
		}

		const candidates = pool.sort(() => Math.random() - 0.5);
		let picks = candidates.slice(0, 3);

		// Garantie d'achat "normale" : jamais bloque sur un role faute de budget
		// tant qu'un champion payant reste finançable. Si aucune des 3 offres ne
		// l'est, on remplace la plus chere par le moins cher champion payant
		// disponible pour ce role.
		if (picks.length && !picks.some((c) => this.canPick(c))) {
			const cheapest = [...candidates].sort((a, b) => a.cost - b.cost)[0];
			if (cheapest && !picks.some((c) => c.id === cheapest.id)) {
				const priciestIndex = picks.reduce(
					(worst, c, i) => (c.cost > picks[worst].cost ? i : worst),
					0,
				);
				picks = [...picks];
				picks[priciestIndex] = cheapest;
			}
		}

		// Filet de securite ultime : le role est injouable meme au moins cher
		// champion payant (plus assez de budget pour une "commune"). On glisse
		// alors un sbire (cout 0) dans les offres, uniquement dans ce cas : en
		// temps normal, aucun sbire ne doit apparaitre (cf. demande produit).
		const cheapestPaid = [...candidates].sort((a, b) => a.cost - b.cost)[0];
		const roleUnaffordable = !cheapestPaid || !this.canPick(cheapestPaid);
		if (roleUnaffordable) {
			const sbire = rolePool.find((c) => this.isSbire(c));
			if (sbire) {
				if (picks.length < 3) {
					picks = [...picks, sbire];
				} else if (!picks.some((c) => c.id === sbire.id)) {
					const priciestIndex = picks.reduce(
						(worst, c, i) => (c.cost > picks[worst].cost ? i : worst),
						0,
					);
					picks = [...picks];
					picks[priciestIndex] = sbire;
				}
			}
		}

		this.offers.set(picks);
	}

	protected rarityMeta(rarity: ChampionRarity) {
		return RARITY_META[rarity];
	}

	protected eventLabel(event: DraftEvent): string {
		return DRAFT_EVENT_META[event].label;
	}

	protected eventDescription(event: DraftEvent): string {
		return DRAFT_EVENT_META[event].description;
	}

	synergyPreview(): string[] {
		const picks = this.picked();
		const tags = new Set(picks.flatMap((c) => c.tags));
		const lines: string[] = [];
		if (tags.has("engage") && tags.has("cc-heavy"))
			lines.push("Engage + CC lourd");
		if (tags.has("ad") && tags.has("ap")) lines.push("Degats mixtes");
		if (tags.has("tank") && tags.has("marksman"))
			lines.push("Frontline pour carry");
		if (tags.has("poke") && tags.has("disengage")) lines.push("Siege safe");
		if (tags.has("scaling-late")) lines.push("Scaling late game");
		return lines.length ? lines : ["Aucune synergie evidente pour le moment"];
	}

	teamPower(): number {
		const pickScore = Math.min(70, this.picked().length * 12);
		const budgetScore = Math.max(
			0,
			Math.min(15, Math.round((this.remaining() / this.currentBudget()) * 15)),
		);
		const synergyScore = Math.min(
			15,
			this.synergyPreview().filter((line) => !line.includes("Aucune")).length *
				5,
		);
		return Math.min(100, Math.max(8, pickScore + budgetScore + synergyScore));
	}

	private static readonly STRATEGY_ICONS: Record<string, IconName> = {
		dive: "sword",
		poke: "comet",
		teamfight: "sparkle",
		splitpush: "tower",
		objectives: "crown",
		vision: "radio",
		snowball: "skull",
		scaling: "moon",
		"full-damage": "flask",
		resistances: "shield",
		utility: "support",
	};

	strategyIcon(optionId: string): IconName {
		return DraftBattleComponent.STRATEGY_ICONS[optionId] ?? "sparkle";
	}

	strategyFlavor(label: string): string {
		const normalized = label.toLowerCase();
		if (normalized.includes("early") || normalized.includes("agress"))
			return "Bonus tempo · snowball";
		if (normalized.includes("team") || normalized.includes("fight"))
			return "Impact 5v5 · clutch";
		if (normalized.includes("scale") || normalized.includes("late"))
			return "Pic late game · comeback";
		if (normalized.includes("macro") || normalized.includes("side"))
			return "Map control · split";
		if (normalized.includes("safe") || normalized.includes("protect"))
			return "Peel · anti throw";
		return "Style draft · identité";
	}

	canSubmit(): boolean {
		return (
			this.picked().length === 5 &&
			this.remaining() >= 0 &&
			this.allStrategySelected()
		);
	}

	selectStrategy(categoryId: string, optionId: string): void {
		if (this.confirmingStep()) return;
		this.strategySelections.update((s) => ({ ...s, [categoryId]: optionId }));
		if (this.isTournament()) {
			const byRole: Partial<Record<Role, string>> = {};
			for (const [r, c] of Object.entries(this.picksByRole())) byRole[r as Role] = c?.id;
			this.draft.reportDraftProgress(byRole, this.strategySelections());
		}
		this.confirmingStep.set(true);
		this.playConfirmPulse(`.strategy-card[data-option-id="${optionId}"]`, () => {
			this.advanceStep();
			this.confirmingStep.set(false);
		});
	}

	submit(): void {
		if (!this.canSubmit()) return;
		const ordered = this.roles
			.map((role) => this.pickFor(role)!)
			.map((c) => c.id);
		this.draft.submitDraft(
			ordered,
			this.rerollsUsed(),
			this.strategySelections(),
		);
		this.submitted.set(true);
	}

	/** Le cote reellement favori par totalScore (mode simple uniquement : le score n'est jamais expose en tournoi). */
	favoredPlayer(): DraftResult | undefined {
		const a = this.duelPlayerA();
		const b = this.duelPlayerB();
		if (!a || !b) return a;
		return a.totalScore >= b.totalScore ? a : b;
	}

	winChance(): number {
		const a = this.duelPlayerA()?.totalScore ?? 0;
		const b = this.duelPlayerB()?.totalScore ?? 0;
		const diff = Math.abs(a - b);
		return Math.min(92, Math.max(52, 58 + Math.round(diff * 0.8)));
	}

	nextCinematic(): void {
		const phaseCount = this.currentScenario()?.phases.length ?? 1;
		if (this.cinematicStep() < phaseCount - 1) {
			this.cinematicStep.update((step) => step + 1);
			return;
		}
		if (this.isTournament()) {
			if (this.isViewingMyMatch()) {
				this.hasSeenMyResult.set(true);
				const key = this.myMatchKey();
				if (key) this.draft.matchSeen(key);
			} else {
				this.viewingMatchKey.set(this.myMatchKey());
			}
			this.cinematicStep.set(0);
			return;
		}
		this.showFinalResults.set(true);
		this.draft.matchSeen("single");
		if (this.mix.active()) this.submitDraftMix();
	}

	/** Vrai une fois que les duellistes ont fini de regarder leur combat : avant ca, personne d'autre ne doit voir le vainqueur. */
	protected isSingleRevealed(): boolean {
		return this.draft.isRevealed("single");
	}

	protected isMatchRevealed(match: DraftMatchState): boolean {
		return this.draft.isRevealed(`${match.round}-${match.matchIndex}`);
	}

	private submitDraftMix(): void {
		if (this.submittedToMix()) return;
		const myId = this.room.myId();

		if (this.isTournament()) {
			const championId = this.tournamentChampionId();
			const progress = this.draft.tournamentProgress();
			if (!championId || !progress) return;
			this.submittedToMix.set(true);
			const wins = progress.rounds
				.flatMap((r) => r.matches)
				.filter((m) => m.winnerId === myId).length;
			const isChampion = myId === championId;
			const points = isChampion ? 100 : Math.max(5, wins * 20);
			const summary = isChampion
				? `Draft Battle : tournoi remporte (${progress.rounds.length} tours).`
				: `Draft Battle : elimine du tournoi apres ${wins} victoire(s).`;
			this.room.submitMixSegment(points, summary);
			return;
		}

		const results = this.draft.results();
		if (!results) return;
		this.submittedToMix.set(true);
		const myResult = results.find((result) => result.playerId === myId);
		const points = myResult?.isWinner
			? 100
			: Math.max(0, Math.round((myResult?.totalScore ?? 0) / 2));
		this.room.submitMixSegment(
			points,
			myResult?.isWinner
				? "Draft Battle : victoire de compo, le lobby subit la macro."
				: "Draft Battle : compo correcte, mais pas assez pour prendre le Nexus.",
		);
	}

	sortedResults<T extends { totalScore: number }>(results: T[]): T[] {
		return [...results].sort((a, b) => b.totalScore - a.totalScore);
	}
}
