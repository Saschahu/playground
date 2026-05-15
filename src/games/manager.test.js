import { test } from 'node:test';
import assert from 'node:assert';
import { openDb } from '../db/db.js';
import { GameManager } from './manager.js';
import { unlinkSync, existsSync } from 'node:fs';

const TEST_DB = '/tmp/playground-mgr-test.db';

test('start game persists to db', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);
  const mgr = new GameManager(db);

  const { gameId, state } = mgr.startGame('bot-1');
  assert.ok(gameId);
  assert.strictEqual(state.alive, true);

  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  assert.strictEqual(row.bot_id, 'bot-1');
  assert.strictEqual(row.ended_at, null);

  db.close();
  unlinkSync(TEST_DB);
});

test('hitting wall ends game and saves final score', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);
  const mgr = new GameManager(db);

  const { gameId } = mgr.startGame('bot-1');
  let lastState;
  for (let i = 0; i < 20; i++) {
    try { lastState = mgr.move(gameId, 'up'); } catch { break; }
    if (!lastState.alive) break;
  }
  assert.strictEqual(lastState.alive, false);

  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  assert.ok(row.ended_at);
  assert.strictEqual(row.end_reason, 'wall');

  db.close();
  unlinkSync(TEST_DB);
});
