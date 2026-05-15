import { api } from './api.js';
import { LiveStream } from './ws.js';
import { renderSnake } from './renderer.js';
import { timeAgo } from './time.js';

let activeGame = null;  // { gameId, botId, botName, state }
let queue = [];          // [{ botId, botName, position }]

const featuredEl = document.getElementById('featured');
const queueEl = document.getElementById('queue');
const leaderboardEl = document.querySelector('#leaderboard tbody');
const recentEl = document.querySelector('#recent tbody');

function renderFeatured() {
  if (!activeGame) {
    featuredEl.innerHTML = '<div class="empty-arena">keine aktiven spiele.</div>';
    return;
  }
  const displayName = activeGame.botName || activeGame.botId.slice(0, 8);
  featuredEl.innerHTML = `
    <canvas></canvas>
    <div class="meta">
      <span class="name"><a href="/bot/${activeGame.botId}">${displayName}</a></span>
      <span class="score">${activeGame.state.score} pts</span>
      <span class="ticks">${activeGame.state.ticks} ticks</span>
    </div>
  `;
  renderSnake(featuredEl.querySelector('canvas'), activeGame.state);
}

function renderQueue() {
  if (queue.length === 0) {
    queueEl.innerHTML = '<div class="empty-queue">leer.</div>';
    return;
  }
  queueEl.innerHTML = queue.map(q => {
    const displayName = q.botName || q.botId.slice(0, 8);
    return `
    <div class="queue-item">
      <span class="pos">${q.position}</span>
      <span class="name"><a href="/bot/${q.botId}">${displayName}</a></span>
    </div>
  `;
  }).join('');
}

async function loadLeaderboard() {
  try {
    const top = await api.get('/leaderboard?limit=20');
    leaderboardEl.innerHTML = top.map((row, i) => {
      const name = row.bot_name || row.bot_id.slice(0, 8);
      return `
      <tr>
        <td class="rank">${i + 1}</td>
        <td><a href="/bot/${row.bot_id}">${name}</a></td>
        <td class="score">${row.best_score}</td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="3" style="color:var(--text-very-dim)">noch keine scores.</td></tr>';
  } catch (e) { console.error('leaderboard load failed:', e); }
}

async function loadRecent() {
  try {
    const recent = await api.get('/games/recent?limit=15');
    recentEl.innerHTML = recent.map(g => {
      const name = g.bot_name || g.bot_id.slice(0, 8);
      return `
      <tr>
        <td><a href="/bot/${g.bot_id}">${name}</a></td>
        <td class="score"><a href="/replay/${g.id}">${g.final_score}</a></td>
        <td class="timestamp">${timeAgo(g.ended_at)}</td>
      </tr>
    `;
    }).join('') || '<tr><td colspan="3" style="color:var(--text-very-dim)">noch keine spiele beendet.</td></tr>';
  } catch (e) { console.error('recent load failed:', e); }
}

loadLeaderboard();
loadRecent();

const stream = new LiveStream();

stream.on('snapshot', ({ activeGames, queue: queueData }) => {
  activeGame = activeGames && activeGames[0]
    ? { gameId: activeGames[0].gameId, botId: activeGames[0].botId, botName: activeGames[0].botName, state: activeGames[0].state }
    : null;
  queue = (queueData || []).map((q, i) => ({ botId: q.botId, botName: q.botName, position: q.position || i + 1 }));
  renderFeatured();
  renderQueue();
});

stream.on('game:start', ({ gameId, botId, botName, state }) => {
  activeGame = { gameId, botId, botName, state };
  queue = queue.filter(q => q.botId !== botId);
  renderFeatured();
  renderQueue();
});

stream.on('game:move', ({ gameId, state }) => {
  if (activeGame && activeGame.gameId === gameId) {
    activeGame.state = state;
    renderFeatured();
  }
});

stream.on('game:end', () => {
  activeGame = null;
  renderFeatured();
  loadLeaderboard();
  loadRecent();
});

stream.on('queue:add', ({ botId, botName, position }) => {
  if (!queue.some(q => q.botId === botId)) {
    queue.push({ botId, botName, position });
  }
  renderQueue();
});

stream.on('queue:promote', ({ botId }) => {
  queue = queue.filter(q => q.botId !== botId).map((q, i) => ({ ...q, position: i + 1 }));
  renderQueue();
});

setInterval(loadLeaderboard, 30000);
setInterval(loadRecent, 30000);
