import { api } from './api.js';
import { LiveStream } from './ws.js';
import { renderSnake } from './renderer.js';
import { timeAgo, shortId } from './time.js';

const activeGames = new Map();

const arenaEl = document.getElementById('arena');
const leaderboardEl = document.querySelector('#leaderboard tbody');
const recentEl = document.querySelector('#recent tbody');

function renderArena() {
  if (activeGames.size === 0) {
    arenaEl.innerHTML = '<div class="empty-arena">keine aktiven spiele.</div>';
    return;
  }
  arenaEl.innerHTML = '';
  for (const [gameId, g] of activeGames) {
    const tile = document.createElement('div');
    tile.className = 'game-tile';
    tile.innerHTML = `
      <canvas></canvas>
      <div class="meta">
        <a href="/bot/${g.botId}">${shortId(g.botId)}</a>
        <span class="score">${g.state.score}</span>
      </div>
    `;
    arenaEl.appendChild(tile);
    renderSnake(tile.querySelector('canvas'), g.state);
  }
}

async function loadLeaderboard() {
  try {
    const top = await api.get('/leaderboard?limit=20');
    leaderboardEl.innerHTML = top.map((row, i) => `
      <tr>
        <td class="rank">${i + 1}</td>
        <td><a href="/bot/${row.bot_id}">${shortId(row.bot_id)}</a></td>
        <td class="score">${row.best_score}</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="color:var(--text-very-dim)">noch keine scores.</td></tr>';
  } catch (e) { console.error('leaderboard load failed:', e); }
}

async function loadRecent() {
  try {
    const recent = await api.get('/games/recent?limit=15');
    recentEl.innerHTML = recent.map(g => `
      <tr>
        <td><a href="/bot/${g.bot_id}">${shortId(g.bot_id)}</a></td>
        <td class="score"><a href="/replay/${g.id}">${g.final_score}</a></td>
        <td class="timestamp">${timeAgo(g.ended_at)}</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="color:var(--text-very-dim)">noch keine spiele beendet.</td></tr>';
  } catch (e) { console.error('recent load failed:', e); }
}

loadLeaderboard();
loadRecent();

const stream = new LiveStream();

stream.on('snapshot', ({ activeGames: games }) => {
  activeGames.clear();
  for (const g of games) {
    activeGames.set(g.gameId, { botId: g.botId, state: g.state });
  }
  renderArena();
});

stream.on('game:start', ({ gameId, botId, state }) => {
  activeGames.set(gameId, { botId, state });
  renderArena();
});

stream.on('game:move', ({ gameId, state }) => {
  const game = activeGames.get(gameId);
  if (game) {
    game.state = state;
    renderArena();
  }
});

stream.on('game:end', ({ gameId }) => {
  activeGames.delete(gameId);
  renderArena();
  loadLeaderboard();
  loadRecent();
});

setInterval(loadLeaderboard, 30000);
setInterval(loadRecent, 30000);
