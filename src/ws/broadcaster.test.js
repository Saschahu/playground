import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { WebSocket } from 'ws';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { unlinkSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const TEST_DB = '/tmp/playground-ws-test.db';
const TEST_PORT = 3098;
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

async function mcpCall(toolName, args) {
  const res = await fetch(`http://127.0.0.1:${TEST_PORT}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: Math.floor(Math.random() * 1e6),
      method: 'tools/call', params: { name: toolName, arguments: args }
    })
  });
  const text = await res.text();
  let body;
  if (text.startsWith('event:') || text.startsWith('data:')) {
    const dataLine = text.split('\n').find(l => l.startsWith('data: '));
    body = JSON.parse(dataLine.substring(6));
  } else { body = JSON.parse(text); }
  if (body.error) throw new Error(body.error.message);
  return JSON.parse(body.result.content[0].text);
}

test('websocket client receives snapshot then game events', async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws`);
  const events = [];
  ws.on('message', (data) => events.push(JSON.parse(data.toString())));

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
    setTimeout(() => reject(new Error('ws open timeout')), 3000);
  });

  await wait(200);
  assert.strictEqual(events[0]?.event, 'snapshot');

  const botId = randomUUID();
  const { game_id } = await mcpCall('start_game', { bot_id: botId });
  await wait(300);

  const startEvent = events.find(e => e.event === 'game:start' && e.data.gameId === game_id);
  assert.ok(startEvent, 'game:start event empfangen');

  await mcpCall('make_move', { bot_id: botId, game_id, direction: 'up' });
  await wait(300);
  const moveEvent = events.find(e => e.event === 'game:move' && e.data.gameId === game_id);
  assert.ok(moveEvent, 'game:move event empfangen');

  ws.close();
});
