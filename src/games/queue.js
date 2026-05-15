export class GameQueue {
  constructor() {
    this.activeGameId = null;
    this.activeBot = null;
    this.pending = [];
    this.maxQueueSize = 50;
  }

  hasActiveGame() { return this.activeGameId !== null; }

  tryEnqueue(botId, botName) {
    if (this.activeBot === botId) return { error: 'already in active game' };
    if (this.pending.some(p => p.botId === botId)) return { error: 'already queued' };
    if (!this.activeGameId) return { status: 'ready' };
    if (this.pending.length >= this.maxQueueSize) return { error: 'queue full, try later' };
    this.pending.push({ botId, botName, queuedAt: new Date().toISOString() });
    return { status: 'queued', position: this.pending.length, ahead: this.pending.length - 1 };
  }

  setActive(gameId, botId) {
    this.activeGameId = gameId;
    this.activeBot = botId;
  }

  clearActive() {
    this.activeGameId = null;
    this.activeBot = null;
  }

  popNext() { return this.pending.shift() || null; }

  positionOf(botId) {
    const idx = this.pending.findIndex(p => p.botId === botId);
    return idx === -1 ? null : idx + 1;
  }

  removeBot(botId) {
    this.pending = this.pending.filter(p => p.botId !== botId);
  }

  snapshot() {
    return {
      activeGameId: this.activeGameId,
      queue: this.pending.map((p, i) => ({ ...p, position: i + 1 }))
    };
  }
}
