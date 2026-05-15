import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { validateBotId } from '../auth/identify.js';

const DIRECTIONS = ['up', 'down', 'left', 'right'];

export function createMcpServer(gameManager, rateLimiter, timeoutWorker, leaderboard) {
  const server = new McpServer(
    { name: 'playground', version: '0.4.0' },
    { capabilities: { tools: {} } }
  );

  server.tool(
    'start_game',
    'start a new snake game. returns game_id and initial state, or queued status if another game is active.',
    {
      bot_id: z.string().describe('your bot uuid v4 (persist this between calls)'),
      bot_name: z.string().optional().describe('optional display name (auto-generated if omitted)')
    },
    async ({ bot_id, bot_name }) => {
      validateBotId(bot_id);
      rateLimiter.checkCanStart(bot_id);
      const result = gameManager.startGame(bot_id, bot_name || null);
      if (result.status === 'active') {
        return {
          content: [{ type: 'text', text: JSON.stringify({ game_id: result.gameId, state: result.state, status: 'active' }, null, 2) }]
        };
      } else {
        return {
          content: [{ type: 'text', text: JSON.stringify({ game_id: result.gameId, status: 'queued', position: result.position, message: result.message }, null, 2) }]
        };
      }
    }
  );

  server.tool(
    'make_move',
    'make a move in a snake game. returns updated state.',
    {
      bot_id: z.string(),
      game_id: z.string(),
      direction: z.enum(['up', 'down', 'left', 'right'])
    },
    async ({ bot_id, game_id, direction }) => {
      validateBotId(bot_id);
      const game = gameManager.activeGames.get(game_id);
      if (!game) throw new Error(`unknown or ended game: ${game_id}`);
      if (game.botId !== bot_id) throw new Error(`game ${game_id} does not belong to bot ${bot_id}`);

      const newState = gameManager.move(game_id, direction);
      timeoutWorker.recordMove(game_id);

      return {
        content: [{ type: 'text', text: JSON.stringify({ state: newState }, null, 2) }]
      };
    }
  );

  server.tool(
    'get_state',
    'get the current state of an active game (for recovery or checking queue position).',
    {
      bot_id: z.string(),
      game_id: z.string()
    },
    async ({ bot_id, game_id }) => {
      validateBotId(bot_id);
      // check if queued
      const queuedPos = gameManager.getQueuedGame(bot_id);
      if (queuedPos) {
        return { content: [{ type: 'text', text: JSON.stringify({ status: 'queued', position: queuedPos.position }) }] };
      }
      const game = gameManager.activeGames.get(game_id);
      if (!game) {
        const row = gameManager.db.prepare('SELECT * FROM games WHERE id = ?').get(game_id);
        if (!row) throw new Error(`unknown game: ${game_id}`);
        if (row.bot_id !== bot_id) throw new Error(`not your game`);
        return { content: [{ type: 'text', text: JSON.stringify({ ended: true, final_score: row.final_score, end_reason: row.end_reason }) }] };
      }
      if (game.botId !== bot_id) throw new Error(`not your game`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ state: game.state, status: 'active' }, null, 2) }]
      };
    }
  );

  server.tool(
    'get_leaderboard',
    'get top scores. optional: period = "all" | "week" | "day".',
    {
      limit: z.number().int().min(1).max(100).default(20).optional(),
      period: z.enum(['all', 'week', 'day']).default('all').optional()
    },
    async ({ limit = 20, period = 'all' }) => {
      const top = leaderboard.top(limit, period);
      return {
        content: [{ type: 'text', text: JSON.stringify({ leaderboard: top }, null, 2) }]
      };
    }
  );

  server.tool(
    'get_bot_profile',
    'get profile of a bot: games played, best score, average.',
    { bot_id: z.string() },
    async ({ bot_id }) => {
      validateBotId(bot_id);
      const profile = leaderboard.botProfile(bot_id);
      return {
        content: [{ type: 'text', text: JSON.stringify({ profile }, null, 2) }]
      };
    }
  );

  return server;
}
