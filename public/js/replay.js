import { api } from './api.js';
import { renderSnake } from './renderer.js';
import { shortId } from './time.js';

const gameId = location.pathname.split('/').pop();
const canvas = document.getElementById('replay-canvas');
const playBtn = document.getElementById('play-pause');
const speedBtn = document.getElementById('speed');
const frameInfo = document.getElementById('frame-info');

let states = [];
let frame = 0;
let playing = false;
let speed = 1;
let interval = null;

const SPEEDS = [1, 2, 5, 10];

function render() {
  if (!states[frame]) return;
  renderSnake(canvas, states[frame]);
  frameInfo.textContent = `${frame + 1} / ${states.length} — score ${states[frame].score}`;
}

function play() {
  if (interval) clearInterval(interval);
  playing = true;
  playBtn.textContent = 'pause';
  interval = setInterval(() => {
    if (frame < states.length - 1) {
      frame++;
      render();
    } else {
      pause();
    }
  }, 200 / speed);
}

function pause() {
  if (interval) { clearInterval(interval); interval = null; }
  playing = false;
  playBtn.textContent = 'play';
}

playBtn.onclick = () => playing ? pause() : play();
document.getElementById('step-back').onclick = () => { pause(); if (frame > 0) { frame--; render(); } };
document.getElementById('step-forward').onclick = () => { pause(); if (frame < states.length - 1) { frame++; render(); } };
speedBtn.onclick = () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  speedBtn.textContent = `${speed}x`;
  if (playing) { pause(); play(); }
};

async function load() {
  try {
    const data = await api.get(`/games/${gameId}/states`);
    states = data.states;
    document.getElementById('replay-meta').innerHTML =
      `<a href="/bot/${data.bot_id}">${shortId(data.bot_id)}</a> — final score ${data.final_score}, ended by ${data.end_reason}`;
    render();
  } catch (e) {
    document.getElementById('replay-meta').textContent = `nicht gefunden: ${gameId}`;
  }
}

load();
