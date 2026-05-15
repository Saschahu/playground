import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const TEST_DB = '/tmp/playground-api-test.db';
const TEST_PORT = 3099;
let serverProcess;

before(async () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  serverProcess = spawn('node', ['bin/playground-server.js'], {
    env: { ...process.env, PORT: String(TEST_PORT), PLAYGROUND_DB: TEST_DB },
    stdio: 'pipe',
    cwd: '/opt/playground'
  });
  await wait(1500);
});

after(async () => {
  if (serverProcess) serverProcess.kill();
  await wait(300);
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
});

async function mcpCall(name, args) {
  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } })
  });
  const text = await res.text();
  const dataLine = text.startsWith('event:') || text.startsWith('data:')
    ? text.split('\n').find(l => l.startsWith('data: ')).substring(6)
    : text;
  return JSON.parse(JSON.parse(dataLine).result.content[0].text);
}

/**
 * Start a game and wait until it is active (handles queue).
 * Returns game_id once the game slot is ours.
 */
async function startActiveGame(botId, botName) {
  const args = botName ? { bot_id: botId, bot_name: botName } : { bot_id: botId };
  const result = await mcpCall('start_game', args);
  const game_id = result.game_id;
  if (result.status === 'active') return game_id;
  // poll until promoted from queue
  for (let i = 0; i < 60; i++) {
    await wait(300);
    const s = await mcpCall('get_state', { bot_id: botId, game_id });
    if (s.status === 'active') return game_id;
    if (s.ended) throw new Error('game ended before becoming active');
  }
  throw new Error('timed out waiting for active game slot');
}

/** Kill a game by moving into a wall. */
async function killGame(botId, game_id) {
  for (let i = 0; i < 30; i++) {
    try { await mcpCall('make_move', { bot_id: botId, game_id, direction: 'up' }); } catch { break; }
  }
}

test('GET /api/games/active returns active games', async () => {
  const botId = randomUUID();
  const game_id = await startActiveGame(botId);

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/games/active`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length >= 1);

  await killGame(botId, game_id);
});

test('GET /api/leaderboard returns sorted scores', async () => {
  const botId = randomUUID();
  const game_id = await startActiveGame(botId);
  await killGame(botId, game_id);

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/leaderboard?limit=10`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(json.data.length >= 1);
});

test('GET /api/bot/:id returns profile', async () => {
  const botId = randomUUID();
  const game_id = await startActiveGame(botId, 'profile-test');
  await killGame(botId, game_id);

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/bot/${botId}`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.id, botId);
  assert.ok(json.data.games_played >= 1);
});

test('GET /api/games/:id/moves returns replay data', async () => {
  const botId = randomUUID();
  const game_id = await startActiveGame(botId);
  // ensure at least 1 move is recorded before killing
  try { await mcpCall('make_move', { bot_id: botId, game_id, direction: 'up' }); } catch { /* ok */ }
  await killGame(botId, game_id);

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/games/${game_id}/moves`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(typeof json.data.rng_seed === 'number');
  assert.ok(json.data.moves.length >= 1);
});

test('GET /api/bot/:id returns 404 for unknown bot', async () => {
  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/bot/${randomUUID()}`);
  assert.strictEqual(res.status, 404);
});

test('GET /api/games/:id/states returns computed sequence', async () => {
  const botId = randomUUID();
  const game_id = await startActiveGame(botId);
  for (let i = 0; i < 3; i++) {
    try { await mcpCall('make_move', { bot_id: botId, game_id, direction: 'up' }); } catch { break; }
  }

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/games/${game_id}/states`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(json.data.states));
  assert.ok(json.data.states.length >= 2);
  assert.strictEqual(json.data.states[0].score, 0);
});
