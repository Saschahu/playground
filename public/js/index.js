import { api } from './api.js';
import { LiveStream } from './ws.js';
import { renderSnake } from './renderer.js';
import { timeAgo } from './time.js';

let activeGame = null;
let queue = [];

const featuredEl    = document.getElementById('featured');
const gameHeaderEl  = document.getElementById('game-header');
const gameFooterEl  = document.getElementById('game-footer');
const queueEl       = document.getElementById('queue');
const leaderboardEl = document.getElementById('leaderboard');
const recentEl      = document.getElementById('recent');

// -- Replay ---------------------------------------------------
let replayFrames = [];
let replayMeta   = null;
let replayTimer  = null;
let replayIdx    = 0;

async function startReplay() {
  stopReplay();
  try {
    const recent = await api.get('/games/recent?limit=1');
    if (!recent || recent.length === 0) return;
    const g   = recent[0];
    const res = await api.get(`/games/${g.id}/states`);
    const { states, final_score, game_id } = res;
    if (!states || states.length === 0) return;
    replayMeta   = { gameId: game_id, botId: g.bot_id, botName: g.bot_name, finalScore: final_score };
    replayFrames = states;
    replayIdx    = 0;
    tickReplay();
  } catch (e) { console.error('replay failed:', e); }
}

function stopReplay() {
  clearTimeout(replayTimer);
  replayTimer  = null;
  replayFrames = [];
  replayMeta   = null;
  featuredEl.classList.remove('is-replay');
}

function tickReplay() {
  if (activeGame || !replayFrames.length) return;
  const state       = replayFrames[replayIdx];
  const displayName = replayMeta.botName || replayMeta.botId.slice(0, 8);
  const score       = String(state.score || 0).padStart(4, '0');

  gameHeaderEl.innerHTML = `
    <div>
      <div class="pg-status-row">
        <div class="pg-replay-pill">&#9658; REPLAY</div>
      </div>
      <div class="pg-bot-name-big">
        <a href="/bot/${replayMeta.botId}">${displayName}</a>
      </div>
    </div>
    <div class="pg-score-wrap">
      <div class="pg-score-sup">Score</div>
      <div class="pg-score-big">${score}</div>
    </div>
  `;

  featuredEl.classList.add('is-replay');
  if (!featuredEl.querySelector('canvas')) {
    featuredEl.innerHTML = "<canvas></canvas>";
  }
  renderSnake(featuredEl.querySelector('canvas'), state);

  const len   = state.snake?.length ?? '-';
  const ticks = state.ticks ?? '-';
  gameFooterEl.innerHTML = `
    <div class="pg-ft-stat"><div class="pg-ft-k">&#9658; Replay</div><div class="pg-ft-v pg-ft-replay">#${replayMeta.gameId.slice(0,8)}</div></div>
    <div class="pg-ft-stat"><div class="pg-ft-k">Length</div><div class="pg-ft-v">${len}</div></div>
    <div class="pg-ft-stat"><div class="pg-ft-k">Ticks</div><div class="pg-ft-v">${ticks}</div></div>
    <div class="pg-ft-stat"><div class="pg-ft-k">Score</div><div class="pg-ft-v">${replayMeta.finalScore}</div></div>
  `;

  replayIdx   = (replayIdx + 1) % replayFrames.length;
  replayTimer = setTimeout(tickReplay, 80);
}

// -- Live Game ------------------------------------------------
function renderFeatured() {
  if (!activeGame) {
    if (!replayFrames.length) {
      gameHeaderEl.innerHTML = '<div class="pg-empty-status">keine aktiven spiele.</div>';
      featuredEl.innerHTML   = '';
      gameFooterEl.innerHTML = '';
    }
    return;
  }
  const displayName = activeGame.botName || activeGame.botId.slice(0, 8);
  const score = String(activeGame.state.score || 0).padStart(4, '0');

  gameHeaderEl.innerHTML = `
    <div>
      <div class="pg-status-row">
        <div class="pg-now-pill">NOW PLAYING</div>
      </div>
      <div class="pg-bot-name-big">
        <a href="/bot/${activeGame.botId}">${displayName}</a>
      </div>
    </div>
    <div class="pg-score-wrap">
      <div class="pg-score-sup">Score</div>
      <div class="pg-score-big">${score}</div>
    </div>
  `;

  if (!featuredEl.querySelector('canvas')) {
    featuredEl.innerHTML = '<canvas></canvas>';
  }
  renderSnake(featuredEl.querySelector('canvas'), activeGame.state);

  const len   = activeGame.state.snake?.length ?? '-';
  const ticks = activeGame.state.ticks ?? '-';
  const alive = activeGame.state.alive ? 'ALIVE' : 'DEAD';
  gameFooterEl.innerHTML = `
    <div class="pg-ft-stat"><div class="pg-ft-k">Length</div><div class="pg-ft-v">${len}</div></div>
    <div class="pg-ft-stat"><div class="pg-ft-k">Ticks</div><div class="pg-ft-v">${ticks}</div></div>
    <div class="pg-ft-stat"><div class="pg-ft-k">Status</div><div class="pg-ft-v">${alive}</div></div>
  `;
}

function renderQueue() {
  if (queue.length === 0) {
    queueEl.innerHTML = '<div class="pg-q-empty">leer.</div>';
    return;
  }
  queueEl.innerHTML = queue.map(q => {
    const displayName = q.botName || q.botId.slice(0, 8);
    return `
    <div class="pg-q-item">
      <div class="pg-q-badge">${q.position}</div>
      <div class="pg-q-name"><a href="/bot/${q.botId}">${displayName}</a></div>
    </div>
  `;
  }).join('');
}

async function loadLeaderboard() {
  try {
    const top = await api.get('/leaderboard?limit=20');
    if (!top || top.length === 0) {
      leaderboardEl.innerHTML = '<div class="pg-lb-empty">noch keine scores.</div>';
      return;
    }
    leaderboardEl.innerHTML = top.map((row, i) => {
      const name    = row.bot_name || row.bot_id.slice(0, 8);
      const isChamp = i === 0;
      const rankHtml = isChamp
        ? `<div class="pg-lb-rank champ">1</div>`
        : `<div class="pg-lb-rank">#${i + 1}</div>`;
      return `
      <div class="pg-lb-item">
        <div class="pg-lb-rank-wrap">${rankHtml}</div>
        <div class="pg-lb-info">
          <div class="pg-lb-name"><a href="/bot/${row.bot_id}">${name}</a></div>
          <div class="pg-lb-score">${row.best_score.toLocaleString()}</div>
        </div>
      </div>
    `;
    }).join('');
  } catch (e) { console.error('leaderboard load failed:', e); }
}

async function loadRecent() {
  try {
    const recent = await api.get('/games/recent?limit=15');
    recentEl.innerHTML = recent.map((g, i) => {
      const name = g.bot_name || g.bot_id.slice(0, 8);
      return `<div class="pg-recent-card">
        <div class="pg-rc-rank">#${i + 1}</div>
        <div class="pg-rc-name"><a href="/bot/${g.bot_id}">${name}</a></div>
        <div class="pg-rc-score"><a href="/replay/${g.id}">${g.final_score}</a></div>
        <div class="pg-rc-time">${timeAgo(g.ended_at)}</div>
      </div>`;
    }).join('') || '<div style="color:var(--pg-dim);padding:.5rem">noch keine spiele beendet.</div>';
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
  if (!activeGame && !replayTimer) startReplay();
});

stream.on('game:start', ({ gameId, botId, botName, state }) => {
  stopReplay();
  activeGame = { gameId, botId, botName, state };
  queue = queue.filter(q => q.botId !== botId);
  featuredEl.innerHTML = '';
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
  startReplay();
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