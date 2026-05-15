import { test } from 'node:test';
import assert from 'node:assert';
import { initState, step } from './snake.js';
import { GRID_W, GRID_H } from './constants.js';

const seededRng = (seed) => {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
};

test('initial state has snake of length 3 and food on grid', () => {
  const s = initState(seededRng(1));
  assert.strictEqual(s.snake.length, 3);
  assert.ok(s.food[0] >= 0 && s.food[0] < GRID_W);
  assert.ok(s.food[1] >= 0 && s.food[1] < GRID_H);
  assert.strictEqual(s.alive, true);
  assert.strictEqual(s.score, 0);
});

test('hitting wall ends game', () => {
  let s = initState(seededRng(1));
  for (let i = 0; i < 12; i++) {
    s = step(s, 'up', seededRng(1));
    if (!s.alive) break;
  }
  assert.strictEqual(s.alive, false);
});

test('180-degree turn is rejected (direction stays)', () => {
  let s = initState(seededRng(1));
  s.direction = 'up';
  s = step(s, 'down', seededRng(1));
  assert.strictEqual(s.direction, 'up');
});

test('eating food increases length and score', () => {
  const state = {
    snake: [[5, 5], [5, 6], [5, 7]],
    food: [5, 4],
    direction: 'up',
    score: 0, ticks: 0, alive: true
  };
  const after = step(state, 'up', seededRng(1));
  assert.strictEqual(after.snake.length, 4);
  assert.ok(after.score >= 10);
});

test('self-collision ends game', () => {
  const state = {
    snake: [[5, 5], [6, 5], [6, 6], [5, 6]],
    food: [0, 0],
    direction: 'up',
    score: 0, ticks: 0, alive: true
  };
  const after = step(state, 'right', seededRng(1));
  assert.strictEqual(after.alive, false);
});
