import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { unlinkSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';

const TEST_DB = '/tmp/playground-int-test.db';
const TEST_PORT = 3097;
let serverProcess;

before(async () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  serverProcess = spawn('node', ['bin/playground-server.js'], {
    cwd: '/opt/playground',
    env: { ...process.env, PORT: String(TEST_PORT), PLAYGROUND_DB: TEST_DB },
    stdio: 'pipe'
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
      jsonrpc: '2.0',
      id: Math.floor(Math.random() * 1000000),
      method: 'tools/call',
      params: { name: toolName, arguments: args }
    })
  });
  const text = await res.text();
  let body;
  if (text.startsWith('event:') || text.startsWith('data:')) {
    const dataLine = text.split('\n').find(l => l.startsWith('data: '));
    body = JSON.parse(dataLine.substring(6));
  } else {
    body = JSON.parse(text);
  }
  if (body.error) throw new Error(body.error.message);
  const content = body.result.content[0].text;
  return JSON.parse(content);
}

test('full game via mcp: start, move, end', async () => {
  const botId = randomUUID();

  const startResult = await mcpCall('start_game', { bot_id: botId, bot_name: 'integration-test-bot' });
  assert.ok(startResult.game_id);
  assert.strictEqual(startResult.state.alive, true);

  let lastState = startResult.state;
  for (let i = 0; i < 30; i++) {
    if (!lastState.alive) break;
    try {
      const moveResult = await mcpCall('make_move', {
        bot_id: botId, game_id: startResult.game_id, direction: 'up'
      });
      lastState = moveResult.state;
    } catch (e) {
      if (e.message.includes('ended')) break;
      throw e;
    }
  }

  assert.strictEqual(lastState.alive, false);

  const lb = await mcpCall('get_leaderboard', { limit: 10 });
  assert.ok(lb.leaderboard.length >= 1);

  const profile = await mcpCall('get_bot_profile', { bot_id: botId });
  assert.strictEqual(profile.profile.games_played, 1);
});
