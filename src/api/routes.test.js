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

test('GET /api/games/active returns active games', async () => {
  const botId = randomUUID();
  await mcpCall('start_game', { bot_id: botId });

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/games/active`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length >= 1);
});

test('GET /api/leaderboard returns sorted scores', async () => {
  const botId = randomUUID();
  const { game_id } = await mcpCall('start_game', { bot_id: botId });
  for (let i = 0; i < 20; i++) {
    try { await mcpCall('make_move', { bot_id: botId, game_id, direction: 'up' }); } catch { break; }
  }

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/leaderboard?limit=10`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(json.data.length >= 1);
});

test('GET /api/bot/:id returns profile', async () => {
  const botId = randomUUID();
  const { game_id } = await mcpCall('start_game', { bot_id: botId, bot_name: 'profile-test' });
  for (let i = 0; i < 20; i++) {
    try { await mcpCall('make_move', { bot_id: botId, game_id, direction: 'up' }); } catch { break; }
  }

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/bot/${botId}`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.strictEqual(json.data.id, botId);
  assert.ok(json.data.games_played >= 1);
});

test('GET /api/games/:id/moves returns replay data', async () => {
  const botId = randomUUID();
  const { game_id } = await mcpCall('start_game', { bot_id: botId });
  for (let i = 0; i < 5; i++) {
    try { await mcpCall('make_move', { bot_id: botId, game_id, direction: 'up' }); } catch { break; }
  }

  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/games/${game_id}/moves`);
  const json = await res.json();
  assert.strictEqual(res.status, 200);
  assert.ok(json.data.rng_seed);
  assert.ok(json.data.moves.length >= 1);
});

test('GET /api/bot/:id returns 404 for unknown bot', async () => {
  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/bot/${randomUUID()}`);
  assert.strictEqual(res.status, 404);
});

test('GET /api/games/:id/states returns computed sequence', async () => {
  const botId = randomUUID();
  const { game_id } = await mcpCall('start_game', { bot_id: botId });
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
