const TIMEOUT_MS = 30_000;
const CHECK_INTERVAL_MS = 5_000;

export class TimeoutWorker {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.lastMoveAt = new Map();
    this.interval = null;
  }

  recordMove(gameId) {
    this.lastMoveAt.set(gameId, Date.now());
  }

  recordStart(gameId) {
    this.lastMoveAt.set(gameId, Date.now());
  }

  start() {
    this.interval = setInterval(() => this.tick(), CHECK_INTERVAL_MS);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }

  tick() {
    const now = Date.now();
    for (const [gameId, lastMove] of this.lastMoveAt) {
      if (now - lastMove > TIMEOUT_MS) {
        if (this.gameManager.activeGames.has(gameId)) {
          this.gameManager.endGame(gameId, 'timeout');
        }
        this.lastMoveAt.delete(gameId);
      }
    }
  }
}
