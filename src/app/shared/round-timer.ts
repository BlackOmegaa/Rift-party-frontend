/**
 * Compte a rebours partage par les mini-jeux a rounds independants
 * (guess-champion, fusion-champions, turret-tank, tiktok-ranking).
 * Chaque joueur demarre son propre decompte localement, mais la duree
 * vient toujours du reglage synchronise cote serveur (RoomSettings.roundTimeSec),
 * donc le temps affiche est le meme pour tout le monde.
 */
export class RoundTimer {
	private readonly remaining = { value: 0 };
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private deadline = 0;
	private onTick: (secondsLeft: number) => void = () => {};

	get secondsLeft(): number {
		return this.remaining.value;
	}

	start(durationSec: number, onTick: (secondsLeft: number) => void, onExpire: () => void): void {
		this.stop();
		this.onTick = onTick;
		this.deadline = Date.now() + durationSec * 1000;
		this.remaining.value = durationSec;
		this.onTick(this.remaining.value);
		this.intervalId = setInterval(() => {
			const secondsLeft = Math.max(0, Math.ceil((this.deadline - Date.now()) / 1000));
			this.remaining.value = secondsLeft;
			this.onTick(secondsLeft);
			if (secondsLeft <= 0) {
				this.stop();
				onExpire();
			}
		}, 250);
	}

	stop(): void {
		if (this.intervalId !== null) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}
}
