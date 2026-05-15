CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  bot_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  final_score INTEGER,
  final_ticks INTEGER,
  end_reason TEXT,
  rng_seed INTEGER NOT NULL,
  FOREIGN KEY (bot_id) REFERENCES bots(id)
);

CREATE TABLE IF NOT EXISTS moves (
  game_id TEXT NOT NULL,
  tick INTEGER NOT NULL,
  direction TEXT NOT NULL,
  PRIMARY KEY (game_id, tick),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE INDEX IF NOT EXISTS idx_games_bot_id ON games(bot_id);
CREATE INDEX IF NOT EXISTS idx_games_final_score ON games(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_games_ended_at ON games(ended_at DESC);
