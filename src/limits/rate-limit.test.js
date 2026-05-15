import { test } from 'node:test';
import assert from 'node:assert';
import { openDb } from '../db/db.js';
import { GameManager } from '../games/manager.js';
import { RateLimiter } from './rate-limit.js';
import { unlinkSync, existsSync } from 'node:fs';

const TEST_DB = '/tmp/playground-rl-test.db';

test('blocks parallel game for same bot', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);
  const mgr = new GameManager(db);
  const rl = new RateLimiter(mgr);

  rl.checkCanStart('bot-a');
  mgr.startGame('bot-a');
  assert.throws(() => rl.checkCanStart('bot-a'), /rate_limit/);

  db.close(); unlinkSync(TEST_DB);
});

test('blocks after 10 starts in a minute', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);
  const mgr = new GameManager(db);
  const rl = new RateLimiter(mgr);

  for (let i = 0; i < 10; i++) {
    rl.checkCanStart('bot-b');
    const { gameId } = mgr.startGame('bot-b');
    mgr.endGame(gameId, 'wall');
  }
  assert.throws(() => rl.checkCanStart('bot-b'), /rate_limit/);

  db.close(); unlinkSync(TEST_DB);
});
