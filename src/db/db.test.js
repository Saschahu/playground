import { test } from 'node:test';
import assert from 'node:assert';
import { openDb } from './db.js';
import { unlinkSync, existsSync } from 'node:fs';

const TEST_DB = '/tmp/playground-test.db';

test('open db creates schema', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const names = tables.map(t => t.name).sort();
  assert.deepStrictEqual(names, ['bots', 'games', 'moves']);

  db.close();
  unlinkSync(TEST_DB);
});

test('insert and read bot', () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  const db = openDb(TEST_DB);

  db.prepare("INSERT INTO bots (id, name, created_at, last_seen_at) VALUES (?, ?, ?, ?)").run(
    'bot-1', 'test-bot', new Date().toISOString(), new Date().toISOString()
  );
  const row = db.prepare("SELECT * FROM bots WHERE id = ?").get('bot-1');
  assert.strictEqual(row.name, 'test-bot');

  db.close();
  unlinkSync(TEST_DB);
});
