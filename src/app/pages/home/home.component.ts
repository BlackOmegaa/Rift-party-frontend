import {
	ChangeDetectionStrategy,
	Component,
	effect,
	signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { RoomService } from "../../core/services/room.service";

type Mode = "create" | "join";

@Component({
	selector: "app-home",
	standalone: true,
	imports: [FormsModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: "./home.component.html",
	styleUrl: "./home.component.scss",
})
export class HomeComponent {
	mode = signal<Mode>("create");
	pseudo = "";
	code = "";

	constructor(
		protected readonly roomService: RoomService,
		private readonly router: Router,
	) {
		effect(() => {
			const room = this.roomService.room();
			if (room) this.router.navigate(["/room", room.code]);
		});
	}

	canSubmit(): boolean {
		if (!this.pseudo.trim()) return false;
		if (this.mode() === "join" && !this.code.trim()) return false;
		return true;
	}

	submit(): void {
		if (this.mode() === "create") {
			this.roomService.createRoom(this.pseudo.trim());
		} else {
			this.roomService.joinRoom(this.code.trim(), this.pseudo.trim());
		}
	}
}
