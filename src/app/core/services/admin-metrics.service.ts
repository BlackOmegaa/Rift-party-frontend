import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BACKEND_URL } from "./socket.service";

export interface AdminMetrics {
	period: { from: string; to: string };
	meta: { excludedVisitors: number };
	live: {
		/** Appareils distincts connectes en ce moment (site ouvert), equipe exclue. */
		onlinePlayersNow: number;
		activeRoomsNow: number;
		activePlayersNow: number;
		activeUsersToday: number;
	};
	todayVsYesterday: {
		activeUsers: { today: number; yesterday: number };
		newVisitors: { today: number; yesterday: number };
	};
	acquisition: {
		uniqueVisitors: number;
		newVisitors: number;
		returningVisitors: number;
		dailySeries: { date: string; uniqueVisitors: number; newVisitors: number; returningVisitors: number }[];
		bySource: { source: string; count: number; pct: number }[];
	};
	conversion: {
		roomsCreated: number;
		visitorToRoomRate: number | null;
		playersJoined: number;
		visitorToGameStartedRate: number | null;
	};
	engagement: {
		totalGamesPlayed: number;
		avgGamesPerRoom: number | null;
		avgSessionDurationSec: number | null;
		avgMatchDurationSec: number | null;
		avgPlayersPerRoom: number | null;
		roomSizeDistribution: { bucket: string; count: number }[];
	};
	modes: {
		ranking: {
			gameId: string;
			launches: number;
			usagePct: number;
			avgDurationSec: number | null;
			abandonRate: number | null;
		}[];
	};
	retention: { d1: number | null; d7: number | null; d30: number | null };
	virality: { invitesGenerated: number; joinedViaInvite: number; inviteToJoinRate: number | null };
	monetization: {
		activeSubscribers: number;
		/** Argent encaisse (factures Stripe payees) sur le mois calendaire en cours. Null si Stripe indisponible. */
		monthRevenue: { amountCents: number; payments: number; currency: string } | null;
		subscription: {
			offerViewed: number;
			ctaClicked: number;
			checkoutStarted: number;
			checkoutCancelled: number;
			completed: number;
		};
		donationClicks: number;
		bySource: { source: string; subClicks: number; subCompleted: number; donationClicks: number }[];
	};
}

export interface BugReport {
	id: string;
	message: string;
	pseudo: string | null;
	roomCode: string | null;
	gameId: string | null;
	anonId: string | null;
	page: string | null;
	status: "OPEN" | "DONE";
	createdAt: string;
}

export type PeriodPreset = "today" | "yesterday" | "7d" | "30d" | "custom";

/** Calcule les bornes from/to (ISO) pour un preset de periode, en heure locale du navigateur. */
export function periodRangeFor(preset: PeriodPreset, custom?: { from: string; to: string }): { from: string; to: string } {
	const now = new Date();
	const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
	const today = startOfDay(now);

	switch (preset) {
		case "today":
			return { from: today.toISOString(), to: now.toISOString() };
		case "yesterday": {
			const yesterday = new Date(today.getTime() - 86_400_000);
			return { from: yesterday.toISOString(), to: today.toISOString() };
		}
		case "7d":
			return { from: new Date(now.getTime() - 7 * 86_400_000).toISOString(), to: now.toISOString() };
		case "30d":
			return { from: new Date(now.getTime() - 30 * 86_400_000).toISOString(), to: now.toISOString() };
		case "custom":
			return custom ?? { from: new Date(now.getTime() - 30 * 86_400_000).toISOString(), to: now.toISOString() };
	}
}

@Injectable({ providedIn: "root" })
export class AdminMetricsService {
	private readonly http = inject(HttpClient);

	getMetrics(range: { from: string; to: string }) {
		return this.http.get<AdminMetrics>(`${BACKEND_URL}/admin/metrics`, { params: range });
	}

	getBugReports() {
		return this.http.get<{ openCount: number; reports: BugReport[] }>(`${BACKEND_URL}/admin/metrics/bug-reports`);
	}

	setBugReportStatus(id: string, status: "OPEN" | "DONE") {
		return this.http.patch<BugReport>(`${BACKEND_URL}/admin/metrics/bug-reports/${id}`, { status });
	}

	/** Marque l'appareil courant (anonId) comme appartenant a l'equipe : exclu de toutes les stats. */
	excludeMe(anonId: string) {
		return this.http.post<{ excluded: boolean; totalExcluded: number }>(
			`${BACKEND_URL}/admin/metrics/exclude-me`,
			{ anonId },
		);
	}
}
