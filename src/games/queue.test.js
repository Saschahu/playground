import { test } from 'node:test';
import assert from 'node:assert';
import { GameQueue } from './queue.js';

test('first enqueue gets ready', () => {
  const q = new GameQueue();
  const result = q.tryEnqueue('bot1', 'first');
  assert.strictEqual(result.status, 'ready');
});

test('second enqueue while first is active goes to queue', () => {
  const q = new GameQueue();
  q.tryEnqueue('bot1', 'first');
  q.setActive('game1', 'bot1');
  const result = q.tryEnqueue('bot2', 'second');
  assert.strictEqual(result.status, 'queued');
  assert.strictEqual(result.position, 1);
});

test('popNext gets the first queued', () => {
  const q = new GameQueue();
  q.setActive('game1', 'bot1');
  q.tryEnqueue('bot2', 'second');
  q.tryEnqueue('bot3', 'third');
  const next = q.popNext();
  assert.strictEqual(next.botId, 'bot2');
});

test('same bot cannot queue twice', () => {
  const q = new GameQueue();
  q.setActive('game1', 'botA');
  q.tryEnqueue('bot2', 'second');
  const result = q.tryEnqueue('bot2', 'second again');
  assert.ok(result.error);
});

test('positionOf returns null if not queued', () => {
  const q = new GameQueue();
  assert.strictEqual(q.positionOf('unknown'), null);
});

test('queue full rejects new entries', () => {
  const q = new GameQueue();
  q.maxQueueSize = 3;
  q.setActive('game1', 'botA');
  q.tryEnqueue('b1', 'b1');
  q.tryEnqueue('b2', 'b2');
  q.tryEnqueue('b3', 'b3');
  const result = q.tryEnqueue('b4', 'b4');
  assert.ok(result.error);
});
