import { Router } from 'express';

export function createApiRouter(gameManager, leaderboard) {
  const router = Router();
  const db = gameManager.db;

  // GET /api/games/active
  router.get('/games/active', (req, res) => {
    try {
      const active = [...gameManager.activeGames.entries()].map(([gameId, g]) => ({
        gameId,
        botId: g.botId,
        botName: g.botName,
        state: g.state
      }));
      res.json({ data: active });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/games/recent?limit=20
  router.get('/games/recent', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const rows = db.prepare(`
        SELECT g.id, g.bot_id, b.name as bot_name, g.started_at, g.ended_at, g.final_score, g.final_ticks, g.end_reason
        FROM games g
        JOIN bots b ON b.id = g.bot_id
        WHERE g.ended_at IS NOT NULL AND g.status = 'ended'
        ORDER BY g.ended_at DESC LIMIT ?
      `).all(limit);
      res.json({ data: rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/games/:id/moves — fur replay
  router.get('/games/:id/moves', (req, res) => {
    try {
      const game = db.prepare('SELECT id, rng_seed FROM games WHERE id = ?').get(req.params.id);
      if (!game) return res.status(404).json({ error: 'game not found' });
      const moves = db.prepare('SELECT tick, direction FROM moves WHERE game_id = ? ORDER BY tick').all(req.params.id);
      res.json({ data: { game_id: game.id, rng_seed: game.rng_seed, moves } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/games/:id/states — computed state-sequence fur replay
  router.get('/games/:id/states', async (req, res) => {
    try {
      const game = db.prepare('SELECT id, bot_id, rng_seed, final_score, end_reason FROM games WHERE id = ?').get(req.params.id);
      if (!game) return res.status(404).json({ error: 'game not found' });
      const moves = db.prepare('SELECT tick, direction FROM moves WHERE game_id = ? ORDER BY tick').all(req.params.id);

      const { initState, step } = await import('../engine/snake.js');

      function seededRng(seed) {
        let s = seed;
        return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      }

      const rng = seededRng(game.rng_seed);
      let state = initState(rng);
      const states = [state];

      for (const move of moves) {
        state = step(state, move.direction, rng);
        states.push(state);
      }

      res.json({ data: { game_id: game.id, bot_id: game.bot_id, final_score: game.final_score, end_reason: game.end_reason, states } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/games/:id
  router.get('/games/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM games WHERE id = ?').get(req.params.id);
      if (!row) return res.status(404).json({ error: 'game not found' });
      res.json({ data: row });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/leaderboard?period=all|week|day&limit=20
  router.get('/leaderboard', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const period = ['all', 'week', 'day'].includes(req.query.period) ? req.query.period : 'all';
      const top = leaderboard.top(limit, period);
      res.json({ data: top, period });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/queue
  router.get('/queue', (req, res) => {
    try {
      const snap = gameManager.queue.snapshot();
      const active = snap.activeGameId ? [...gameManager.activeGames.entries()]
        .filter(([id]) => id === snap.activeGameId)
        .map(([gameId, g]) => ({ gameId, botId: g.botId, botName: g.botName })) : [];
      res.json({ data: { active: active[0] || null, queue: snap.queue } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/bot/:id
  router.get('/bot/:id', (req, res) => {
    try {
      const profile = leaderboard.botProfile(req.params.id);
      const meta = db.prepare('SELECT id, name, created_at, last_seen_at FROM bots WHERE id = ?').get(req.params.id);
      if (!meta) return res.status(404).json({ error: 'bot not found' });
      res.json({ data: { ...meta, ...profile } });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // GET /api/bot/:id/games?limit=20
  router.get('/bot/:id/games', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const games = db.prepare(`
        SELECT id, started_at, ended_at, final_score, final_ticks, end_reason
        FROM games WHERE bot_id = ? AND ended_at IS NOT NULL
        ORDER BY ended_at DESC LIMIT ?
      `).all(req.params.id, limit);
      res.json({ data: games });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  return router;
}
