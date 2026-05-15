import { test } from 'node:test';
import assert from 'node:assert';
import { openDb } from '../db/db.js';
import { GameManager } from './manager.js';
import { TimeoutWorker } from './timeout-worker.js';
import { unlinkSync, existsSync } from 'node:fs';

const TEST_DB = '/tmp/playground-tw-test.db';

test('worker ends timed-out games', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);
  const mgr = new GameManager(db);
  const tw = new TimeoutWorker(mgr);

  const { gameId } = mgr.startGame('bot-x');
  tw.recordStart(gameId);

  tw.lastMoveAt.set(gameId, Date.now() - 35_000);
  tw.tick();

  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  assert.strictEqual(row.end_reason, 'timeout');
  assert.ok(row.ended_at);

  db.close(); unlinkSync(TEST_DB);
});
