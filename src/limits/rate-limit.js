const PARALLEL_LIMIT = 1;
const PER_MINUTE_LIMIT = 10;
const WINDOW_MS = 60_000;

export class RateLimiter {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.botStarts = new Map();
  }

  checkCanStart(botId) {
    const active = [...this.gameManager.activeGames.values()].filter(g => g.botId === botId);
    if (active.length >= PARALLEL_LIMIT) {
      throw new Error(`rate_limit: bot already has ${active.length} active game(s) (max ${PARALLEL_LIMIT})`);
    }

    const now = Date.now();
    const recent = (this.botStarts.get(botId) || []).filter(t => now - t < WINDOW_MS);
    if (recent.length >= PER_MINUTE_LIMIT) {
      throw new Error(`rate_limit: bot exceeded ${PER_MINUTE_LIMIT} games/minute`);
    }
    recent.push(now);
    this.botStarts.set(botId, recent);
  }

  cleanup() {
    const now = Date.now();
    for (const [botId, timestamps] of this.botStarts) {
      const recent = timestamps.filter(t => now - t < WINDOW_MS);
      if (recent.length === 0) this.botStarts.delete(botId);
      else this.botStarts.set(botId, recent);
    }
  }
}
