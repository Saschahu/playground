import { test } from 'node:test';
import assert from 'node:assert';
import { openDb } from '../db/db.js';
import { GameManager } from '../games/manager.js';
import { Leaderboard } from './leaderboard.js';
import { unlinkSync, existsSync } from 'node:fs';

const TEST_DB = '/tmp/playground-lb-test.db';

test('leaderboard returns top scores', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);
  const mgr = new GameManager(db);

  for (const botId of ['bot-a', 'bot-b']) {
    const { gameId } = mgr.startGame(botId);
    for (let i = 0; i < 20; i++) {
      try { mgr.move(gameId, 'up'); } catch { break; }
    }
  }

  const lb = new Leaderboard(db);
  const top = lb.top(10);
  assert.ok(top.length >= 2);
  assert.ok(top[0].best_score >= top[1].best_score);

  db.close();
  unlinkSync(TEST_DB);
});
