#!/usr/bin/env node
import { openDb } from '../src/db/db.js';
import { generateBotName } from '../src/auth/names.js';

const db = openDb(process.env.PLAYGROUND_DB || '/opt/playground/data/playground.db');
const rows = db.prepare("SELECT id FROM bots WHERE name IS NULL OR name = ''").all();

for (const row of rows) {
  const name = generateBotName(row.id);
  db.prepare('UPDATE bots SET name = ? WHERE id = ?').run(name, row.id);
  console.log(`${row.id} -> ${name}`);
}

console.log(`done. updated ${rows.length} bots.`);
db.close();
