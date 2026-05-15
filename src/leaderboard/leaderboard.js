export class Leaderboard {
  constructor(db) { this.db = db; }

  top(limit = 20, period = 'all') {
    let where = '';
    const params = [];
    if (period === 'day') { where = "AND ended_at >= datetime('now', '-1 day')"; }
    else if (period === 'week') { where = "AND ended_at >= datetime('now', '-7 days')"; }

    return this.db.prepare(`
      SELECT bot_id, MAX(final_score) AS best_score, COUNT(*) AS games
      FROM games
      WHERE ended_at IS NOT NULL ${where}
      GROUP BY bot_id
      ORDER BY best_score DESC
      LIMIT ?
    `).all(...params, limit);
  }

  botProfile(botId) {
    const summary = this.db.prepare(`
      SELECT
        COUNT(*) AS games_played,
        MAX(final_score) AS best_score,
        AVG(final_score) AS avg_score,
        MAX(ended_at) AS last_played
      FROM games
      WHERE bot_id = ? AND ended_at IS NOT NULL
    `).get(botId);
    return summary;
  }
}
