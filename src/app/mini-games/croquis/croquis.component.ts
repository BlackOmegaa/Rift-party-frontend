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
import { animateEndScreen } from "../../shared/end-screen-animate";

const CANVAS_WIDTH = 520;
const CANVAS_HEIGHT = 390;
const PALETTE = ["#111111", "#c0392b", "#2980b9", "#27ae60", "#f1c40f", "#8e44ad", "#e67e22", "#7f8c8d"];
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

	private readonly hostElement = inject(ElementRef<HTMLElement>);

	constructor(
		protected readonly room: RoomService,
		protected readonly mix: MixRuntimeService,
		protected readonly croquis: CroquisService,
	) {
		const ticker = setInterval(() => this.now.set(Date.now()), 250);
		inject(DestroyRef).onDestroy(() => clearInterval(ticker));
		this.croquis.requestState();
		effect(() => {
			if (this.croquis.results()) animateEndScreen(this.hostElement.nativeElement);
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
	}

	clearCanvas(): void {
		if (!this.ctx || this.croquis.mySubmitted()) return;
		this.ctx.fillStyle = "#ffffff";
		this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}

	submitDrawing(): void {
		const canvas = this.padRef?.nativeElement;
		if (!canvas) return;
		this.croquis.submitDrawing(canvas.toDataURL("image/png"));
	}

	submitGuess(): void {
		const name = this.guessInput.trim();
		if (!name) return;
		this.croquis.guess(name);
		this.guessInput = "";
	}

	next(): void {
		if (!this.room.isHost()) return;
		this.croquis.next();
	}

	square(name: string): string {
		return championSquareUrl(name);
	}
}
