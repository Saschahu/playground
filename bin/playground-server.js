#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { openDb } from '../src/db/db.js';
import { GameManager } from '../src/games/manager.js';
import { Leaderboard } from '../src/leaderboard/leaderboard.js';
import { RateLimiter } from '../src/limits/rate-limit.js';
import { TimeoutWorker } from '../src/games/timeout-worker.js';
import { createMcpServer } from '../src/mcp/server.js';
import { createHttpApp } from '../src/mcp/http.js';
import { createApiRouter } from '../src/api/routes.js';
import { Broadcaster } from '../src/ws/broadcaster.js';

const PORT = parseInt(process.env.PORT || '3008', 10);
const DB_PATH = process.env.PLAYGROUND_DB || '/opt/playground/data/playground.db';

// public-dir sicherstellen
mkdirSync('/opt/playground/public', { recursive: true });

const db = openDb(DB_PATH);
const gameManager = new GameManager(db);
const leaderboard = new Leaderboard(db);
const rateLimiter = new RateLimiter(gameManager);
const timeoutWorker = new TimeoutWorker(gameManager);
timeoutWorker.start();

const mcpServerFactory = () => createMcpServer(gameManager, rateLimiter, timeoutWorker, leaderboard);
const apiRouter = createApiRouter(gameManager, leaderboard);
const app = createHttpApp(mcpServerFactory, apiRouter);

const httpServer = app.listen(PORT, '127.0.0.1', () => {
  console.log(`playground server listening on 127.0.0.1:${PORT}`);
});

const broadcaster = new Broadcaster(httpServer, gameManager);

function shutdown() {
  console.log('shutting down...');
  timeoutWorker.stop();
  broadcaster.close();
  httpServer.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
