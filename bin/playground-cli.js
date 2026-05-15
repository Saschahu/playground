#!/usr/bin/env node
import { openDb } from '../src/db/db.js';
import { GameManager } from '../src/games/manager.js';
import { Leaderboard } from '../src/leaderboard/leaderboard.js';
import { DIRECTIONS } from '../src/engine/constants.js';

const DB_PATH = process.env.PLAYGROUND_DB || '/opt/playground/data/playground.db';
const BOT_ID = process.argv[2] || `random-bot-${Math.random().toString(36).slice(2, 6)}`;

const db = openDb(DB_PATH);
const mgr = new GameManager(db);

const { gameId, state } = mgr.startGame(BOT_ID);
console.log(`bot: ${BOT_ID}, game: ${gameId}`);
console.log(`initial: snake@${JSON.stringify(state.snake[0])} food@${JSON.stringify(state.food)}`);

let s = state;
while (s.alive && s.ticks < 1000) {
  const dir = DIRECTIONS[Math.floor(Math.random() * 4)];
  try {
    s = mgr.move(gameId, dir);
  } catch (e) {
    console.error('move error:', e.message);
    break;
  }
}

console.log(`ended after ${s.ticks} ticks, score: ${s.score}, alive: ${s.alive}`);

const lb = new Leaderboard(db);
const top = lb.top(5);
console.log('top 5:');
top.forEach((row, i) => console.log(`  ${i+1}. ${row.bot_id} — ${row.best_score} (${row.games} games)`));

db.close();
