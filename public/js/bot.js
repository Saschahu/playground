import { api } from './api.js';
import { timeAgo, shortId } from './time.js';

const botId = location.pathname.split('/').pop();
document.getElementById('bot-id').textContent = botId;

async function loadProfile() {
  try {
    const profile = await api.get(`/bot/${botId}`);
    document.getElementById('games-played').textContent = profile.games_played || 0;
    document.getElementById('best-score').textContent = profile.best_score || 0;
    document.getElementById('avg-score').textContent = profile.avg_score ? Math.round(profile.avg_score) : 0;
    document.getElementById('last-played').textContent = timeAgo(profile.last_played);
    document.getElementById('profile-error').style.display = 'none';
    document.getElementById('profile').style.display = 'block';
  } catch (e) {
    document.getElementById('profile-error').textContent = `nicht gefunden: ${botId}`;
  }
}

async function loadGames() {
  try {
    const games = await api.get(`/bot/${botId}/games?limit=30`);
    const tbody = document.querySelector('#bot-games tbody');
    tbody.innerHTML = games.map(g => `
      <tr>
        <td><a href="/replay/${g.id}">${g.final_score}</a></td>
        <td style="color:var(--text-very-dim)">${g.final_ticks} ticks</td>
        <td style="color:var(--text-very-dim)">${g.end_reason || '—'}</td>
        <td class="timestamp">${timeAgo(g.ended_at)}</td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="color:var(--text-very-dim)">noch keine spiele.</td></tr>';
  } catch (e) { console.error('games load failed:', e); }
}

loadProfile();
loadGames();
