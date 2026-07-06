import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BACKEND_URL } from "./socket.service";

export interface AdminMetrics {
	period: { from: string; to: string };
	live: { activeRoomsNow: number; activePlayersNow: number; activeUsersToday: number };
	connections: { total: number; unique: number; uniqueByDay: { date: string; unique: number }[] };
	retention: { d1: number | null; d7: number | null };
	games: {
		byId: {
			gameId: string;
			started: number;
			completed: number;
			abandoned: number;
			completionRate: number | null;
			abandonRate: number | null;
		}[];
		mostPlayed: string | null;
		leastPlayed: string | null;
		highestAbandon: string | null;
	};
	rooms: { total: number; avgLifetimeSec: number | null; avgSize: number | null };
	tiktok: { totalVotes: number; topQuestions: { question: string; votes: number }[] };
}

@Injectable({ providedIn: "root" })
export class AdminMetricsService {
	private readonly http = inject(HttpClient);

	getMetrics(days = 30) {
		return this.http.get<AdminMetrics>(`${BACKEND_URL}/admin/metrics`, { params: { days } });
	}
}
