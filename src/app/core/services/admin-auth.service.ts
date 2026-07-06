import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { BACKEND_URL } from "./socket.service";

const TOKEN_KEY = "rift-party-admin-token";

@Injectable({ providedIn: "root" })
export class AdminAuthService {
	private readonly http = inject(HttpClient);

	readonly isAuthenticated = signal<boolean>(!!this.getToken());

	getToken(): string | null {
		return localStorage.getItem(TOKEN_KEY);
	}

	async login(email: string, password: string): Promise<void> {
		const res = await firstValueFrom(
			this.http.post<{ token: string }>(`${BACKEND_URL}/admin/login`, { email, password }),
		);
		localStorage.setItem(TOKEN_KEY, res.token);
		this.isAuthenticated.set(true);
	}

	logout(): void {
		localStorage.removeItem(TOKEN_KEY);
		this.isAuthenticated.set(false);
	}
}
