import {
	AfterViewInit,
	ChangeDetectionStrategy,
	Component,
	DestroyRef,
	ElementRef,
	ViewChild,
	computed,
	effect,
	inject,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RoomService } from "../../core/services/room.service";
import { MixRuntimeService } from "../../core/services/mix-runtime.service";
import { CroquisService } from "../../core/services/croquis.service";
import { ChampionSelectComponent } from "../../shared/components/champion-select/champion-select.component";
import { CHAMPION_OPTIONS, championSquareUrl } from "../../shared/lol-assets";
import { IconComponent } from "../../shared/components/icon/icon.component";
import { AudioService } from "../../core/services/audio.service";
import { GameSettingsService } from "../../core/services/game-settings.service";
import { animateEndScreen } from "../../shared/end-screen-animate";
import { burstParticles, floatScore, punchIn, pulse, slideUp } from "../../shared/cinematic/cinematic";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 390;
/** Doit rester synchro avec DRAWING_TIME_SEC cote backend (backend/src/croquis/croquis.service.ts). */
const DRAWING_TIME_SEC = 90;
const PALETTE = ["#ffffff", "#111111", "#7f8c8d", "#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#1abc9c", "#2980b9", "#8e44ad", "#ff6fae", "#8b5a2b"];
const SIZES = [3, 7, 14];

@Component({
	selector: "app-croquis",
	standalone: true,
	imports: [FormsModule, ChampionSelectComponent, IconComponent],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./croquis.component.html",
	styleUrl: "./croquis.component.scss",
})
export class CroquisComponent implements AfterViewInit {
	@ViewChild("pad") padRef?: ElementRef<HTMLCanvasElement>;

	protected readonly canvasWidth = CANVAS_WIDTH;
	protected readonly canvasHeight = CANVAS_HEIGHT;
	protected readonly palette = PALETTE;
	protected readonly sizes = SIZES;
	protected readonly color = signal(PALETTE[0]);
	protected readonly brushSize = signal(SIZES[1]);
	protected readonly erasing = signal(false);

	protected readonly championOptions = CHAMPION_OPTIONS;
	protected guessInput = "";
	private readonly now = signal(Date.now());
	private ctx: CanvasRenderingContext2D | null = null;
	private drawing = false;

	protected readonly remainingSec = computed(() => {
		const phase = this.croquis.phase();
		const deadline = phase === "drawing" ? this.croquis.drawingDeadline() : this.croquis.item()?.deadline;
		if (!deadline || phase === "reveal" || phase === "results") return 0;
		return Math.max(0, Math.ceil((deadline - this.now()) / 1000));
	});

	protected readonly finished = computed(() => !!this.croquis.results());
	protected readonly isArtist = computed(() => this.croquis.item()?.artistId === this.room.myId());
	protected readonly scoreRows = computed(() => this.croquis.results()?.rows ?? []);
	protected readonly myRoundPoints = computed(() => {
		const reveal = this.croquis.lastReveal();
		if (!reveal) return 0;
		return reveal.roundPoints[this.room.myId() ?? ""] ?? 0;
	});
	/** Un seul chip de statut affiche a la fois pendant la phase dessin/guessing. */
	protected readonly drawingTimerPct = computed(() => {
		const total = DRAWING_TIME_SEC;
		return Math.max(0, Math.min(100, (this.remainingSec() / total) * 100));
	});
	protected readonly guessTimerPct = computed(() => {
		const total = this.settings.roundTimeSec();
		return Math.max(0, Math.min(100, (this.remainingSec() / total) * 100));
	});

	private readonly hostElement = inject(ElementRef<HTMLElement>);
	private lastPhase: string | null = null;

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly croquis: CroquisService,
		private readonly audio: AudioService,
		private readonly settings: GameSettingsService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => clearInterval(ticker));
		this.croquis.requestState();
		effect(() => {
			if (this.croquis.results()) {
				this.audio.play("fanfare");
				const host = this.hostElement.nativeElement;
				animateEndScreen(host, {
					onCountTick: () => this.audio.play("score-tick", { volume: 0.4 }),
				});
				requestAnimationFrame(() =>
					burstParticles(host.querySelector(".end-screen"), { count: 42 }),
				);
			}
		});
		// Battement sourd sur les dernieres secondes des timers dessin/guessing.
		effect(() => {
			const secondsLeft = this.remainingSec();
			const phase = this.croquis.phase();
			if ((phase === "drawing" || phase === "guessing") && secondsLeft > 0 && secondsLeft <= 5) {
				this.audio.play("timer-urgent", { volume: 0.7 });
			}
		});
		// Entrees cinematiques a chaque changement de phase.
		effect(() => {
			const phase = this.croquis.phase();
			if (phase === this.lastPhase) return;
			this.lastPhase = phase;
			const host = this.hostElement.nativeElement;
			requestAnimationFrame(() => {
				if (phase === "drawing") {
					punchIn(host.querySelector(".secret-banner"));
					slideUp(host.querySelector(".canvas-frame"), { delay: 0.08 });
					slideUp(host.querySelector(".toolbar"), { delay: 0.14 });
				} else if (phase === "guessing") {
					this.audio.play("reveal", { volume: 0.5 });
					punchIn(host.querySelector(".gallery-frame"));
					slideUp(host.querySelector(".guess-bar"), { delay: 0.12 });
				} else if (phase === "reveal") {
					const reveal = this.croquis.lastReveal();
					this.audio.play(reveal && this.myRoundPoints() > 0 ? "correct" : "reveal");
					const stage = host.querySelector(".verdict-stage") as HTMLElement | null;
					punchIn(host.querySelector(".verdict-champ-name"));
					slideUp(host.querySelector(".guess-list"), { delay: 0.15 });
					if (this.myRoundPoints() > 0) {
						burstParticles(stage, { colors: ["#b673ff", "#e8d1ff", "#3fd67a"], count: 32 });
						floatScore(stage, `+${this.myRoundPoints()}`, "#b673ff");
					}
					pulse(host.querySelector(".score-orb strong"));
				}
			});
		});
	}

	ngAfterViewInit(): void {
		this.initCanvas();
	}

	/** (Re)prepare le canvas : fond blanc plein (le PNG exporte ne doit pas etre transparent). */
	private initCanvas(): void {
		const canvas = this.padRef?.nativeElement;
		if (!canvas) return;
		this.ctx = canvas.getContext("2d");
		if (!this.ctx) return;
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		this.ctx.lineCap = "round";
		this.ctx.lineJoin = "round";
	}

	private pointerPos(event: PointerEvent): { x: number; y: number } {
		const canvas = this.padRef!.nativeElement;
		const rect = canvas.getBoundingClientRect();
		return {
			x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
			y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
		};
	}

	onPointerDown(event: PointerEvent): void {
		if (!this.ctx || this.croquis.mySubmitted()) return;
		event.preventDefault();
		this.padRef!.nativeElement.setPointerCapture(event.pointerId);
		this.drawing = true;
		const { x, y } = this.pointerPos(event);
		this.ctx.strokeStyle = this.erasing() ? "#ffffff" : this.color();
		this.ctx.lineWidth = this.erasing() ? this.brushSize() * 3 : this.brushSize();
		this.ctx.beginPath();
		this.ctx.moveTo(x, y);
		// Un simple clic doit laisser un point.
		this.ctx.lineTo(x + 0.1, y + 0.1);
		this.ctx.stroke();
	}

	onPointerMove(event: PointerEvent): void {
		if (!this.drawing || !this.ctx) return;
		event.preventDefault();
		const { x, y } = this.pointerPos(event);
		this.ctx.lineTo(x, y);
		this.ctx.stroke();
	}

	onPointerUp(): void {
		this.drawing = false;
	}

	pickColor(c: string): void {
		this.color.set(c);
		this.erasing.set(false);
		this.audio.play("ui-click", { volume: 0.5 });
	}

	clearCanvas(): void {
		if (!this.ctx || this.croquis.mySubmitted()) return;
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		this.audio.play("ui-click", { volume: 0.5 });
	}

	submitDrawing(): void {
		const canvas = this.padRef?.nativeElement;
		if (!canvas) return;
		this.croquis.submitDrawing(canvas.toDataURL("image/png"));
		this.audio.play("swap", { volume: 0.7 });
		punchIn(this.hostElement.nativeElement.querySelector(".wait-pill"));
	}

	submitGuess(): void {
		const name = this.guessInput.trim();
		if (!name) return;
		this.croquis.guess(name);
		this.guessInput = "";
		this.audio.play("swap", { volume: 0.7 });
	}

	next(): void {
		if (!this.room.isHost()) return;
		this.croquis.next();
	}

	square(name: string): string {
		return championSquareUrl(name);
	}
}
