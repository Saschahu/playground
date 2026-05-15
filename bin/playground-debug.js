#!/usr/bin/env node
import { openDb } from '../src/db/db.js';
import { Leaderboard } from '../src/leaderboard/leaderboard.js';

const DB_PATH = process.env.PLAYGROUND_DB || '/opt/playground/data/playground.db';

const db = openDb(DB_PATH);

const cmd = process.argv[2] || 'dump';

if (cmd === 'dump') {
  const bots = db.prepare('SELECT * FROM bots').all();
  const games = db.prepare('SELECT id, bot_id, final_score, final_ticks, end_reason, ended_at FROM games ORDER BY ended_at DESC LIMIT 20').all();
  console.log('=== BOTS ===');
  console.table(bots);
  console.log('=== RECENT GAMES ===');
  console.table(games);
  const lb = new Leaderboard(db);
  console.log('=== LEADERBOARD ===');
  console.table(lb.top(10));
} else if (cmd === 'reset') {
  db.prepare('DELETE FROM moves').run();
  db.prepare('DELETE FROM games').run();
  db.prepare('DELETE FROM bots').run();
  console.log('DB reset complete.');
} else {
  console.error(`unknown command: ${cmd}. use: dump | reset`);
}

db.close();
