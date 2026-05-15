import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { initState, step } from '../engine/snake.js';
import { MAX_TICKS, GRID_W, GRID_H, DIR_VECTORS } from '../engine/constants.js';
import { generateBotName } from '../auth/names.js';
import { GameQueue } from './queue.js';

function seededRng(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

export class GameManager extends EventEmitter {
  constructor(db) {
    super();
    this.db = db;
    this.activeGames = new Map();
    this.queue = new GameQueue();
  }

  ensureBot(botId, name = null) {
    const now = new Date().toISOString();
    this.db.prepare(`
      INSERT INTO bots (id, name, created_at, last_seen_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at
    `).run(botId, name, now, now);
  }

  startGame(botId, botName = null) {
    const finalName = botName || generateBotName(botId);
    this.ensureBot(botId, finalName);

    const enqueueResult = this.queue.tryEnqueue(botId, finalName);
    if (enqueueResult.error) {
      throw new Error(enqueueResult.error);
    }

    if (enqueueResult.status === 'ready') {
      const result = this._activateGame(botId, finalName);
      return { gameId: result.gameId, state: result.state, status: 'active' };
    } else {
      // queued: create db record with status='queued'
      const gameId = randomUUID();
      this.db.prepare(`
        INSERT INTO games (id, bot_id, started_at, rng_seed, status, queued_at)
        VALUES (?, ?, datetime('now'), ?, 'queued', datetime('now'))
      `).run(gameId, botId, 0);

      this.emit('queue:add', { botId, botName: finalName, position: enqueueResult.position });

      return {
        gameId,
        status: 'queued',
        position: enqueueResult.position,
        message: `queued. ${enqueueResult.ahead} bot(s) ahead. use get_state to know when active.`
      };
    }
  }

  _activateGame(botId, botName) {
    const gameId = randomUUID();
    const seed = Math.floor(Math.random() * 1_000_000);
    const rng = seededRng(seed);
    const state = initState(rng);

    this.db.prepare(`
      INSERT INTO games (id, bot_id, started_at, rng_seed, status, activated_at)
      VALUES (?, ?, datetime('now'), ?, 'active', datetime('now'))
    `).run(gameId, botId, seed);

    this.activeGames.set(gameId, { state, rng, botId, botName, seed });
    this.queue.setActive(gameId, botId);

    this.emit('game:start', { gameId, botId, botName, state, startedAt: new Date().toISOString() });
    return { gameId, state };
  }

  move(gameId, direction) {
    const game = this.activeGames.get(gameId);
    if (!game) throw new Error(`unknown game: ${gameId}`);
    if (!game.state.alive) throw new Error(`game already ended: ${gameId}`);

    const newState = step(game.state, direction, game.rng);
    game.state = newState;

    this.db.prepare(`INSERT INTO moves (game_id, tick, direction) VALUES (?, ?, ?)`).run(gameId, newState.ticks, direction);
    this.emit('game:move', { gameId, botId: game.botId, state: newState });

    if (!newState.alive || newState.ticks >= MAX_TICKS) {
      const reason = !newState.alive ? this.detectEndReason(newState) : 'max_ticks';
      this.endGame(gameId, reason);
    }

    return newState;
  }

  detectEndReason(state) {
    const [dx, dy] = DIR_VECTORS[state.direction];
    const head = state.snake[0];
    const newHead = [head[0] + dx, head[1] + dy];
    if (newHead[0] < 0 || newHead[0] >= GRID_W || newHead[1] < 0 || newHead[1] >= GRID_H) return 'wall';
    return 'self';
  }

  endGame(gameId, reason) {
    const game = this.activeGames.get(gameId);
    if (!game) return;
    this.db.prepare(`
      UPDATE games SET ended_at = datetime('now'), final_score = ?, final_ticks = ?, end_reason = ?, status = 'ended'
      WHERE id = ?
    `).run(game.state.score, game.state.ticks, reason, gameId);
    this.activeGames.delete(gameId);
    this.queue.clearActive();

    this.emit('game:end', { gameId, botId: game.botId, finalScore: game.state.score, finalTicks: game.state.ticks, reason });

    // promote next from queue
    const next = this.queue.popNext();
    if (next) {
      const { gameId: newGameId, state } = this._activateGame(next.botId, next.botName);
      this.emit('queue:promote', { botId: next.botId, gameId: newGameId, state });
    }
  }

  getQueuedGame(botId) {
    const pos = this.queue.positionOf(botId);
    if (pos !== null) return { status: 'queued', position: pos };
    return null;
  }
}
