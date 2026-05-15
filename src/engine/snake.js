import { GRID_W, GRID_H, INITIAL_LENGTH, SCORE_PER_FOOD, SCORE_PER_TICK, DIR_VECTORS, OPPOSITE } from './constants.js';

/** @typedef {[number, number]} Cell */
/** @typedef {{snake: Cell[], food: Cell, direction: string, score: number, ticks: number, alive: boolean}} GameState */

/**
 * Initial state — snake mittig, food zufällig (nicht auf snake).
 * @param {() => number} rng
 * @returns {GameState}
 */
export function initState(rng = Math.random) {
  const cx = Math.floor(GRID_W / 2);
  const cy = Math.floor(GRID_H / 2);
  const snake = [];
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    snake.push([cx, cy + i]);
  }
  return {
    snake,
    food: spawnFood(snake, rng),
    direction: 'up',
    score: 0,
    ticks: 0,
    alive: true
  };
}

/**
 * Einen tick weiter.
 * @param {GameState} state
 * @param {string} newDirection
 * @param {() => number} rng
 * @returns {GameState}
 */
export function step(state, newDirection, rng = Math.random) {
  if (!state.alive) return state;

  const dir = (newDirection === OPPOSITE[state.direction]) ? state.direction : newDirection;
  if (!DIR_VECTORS[dir]) throw new Error(`invalid direction: ${newDirection}`);

  const [dx, dy] = DIR_VECTORS[dir];
  const head = state.snake[0];
  const newHead = [head[0] + dx, head[1] + dy];

  if (newHead[0] < 0 || newHead[0] >= GRID_W || newHead[1] < 0 || newHead[1] >= GRID_H) {
    return { ...state, alive: false, ticks: state.ticks + 1 };
  }

  const willEat = newHead[0] === state.food[0] && newHead[1] === state.food[1];
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some(([x, y]) => x === newHead[0] && y === newHead[1])) {
    return { ...state, alive: false, ticks: state.ticks + 1 };
  }

  const newSnake = [newHead, ...state.snake];
  if (!willEat) newSnake.pop();

  const newFood = willEat ? spawnFood(newSnake, rng) : state.food;
  const scoreDelta = (willEat ? SCORE_PER_FOOD : 0) + SCORE_PER_TICK;

  return {
    snake: newSnake,
    food: newFood,
    direction: dir,
    score: state.score + scoreDelta,
    ticks: state.ticks + 1,
    alive: true
  };
}

function spawnFood(snake, rng) {
  const occupied = new Set(snake.map(([x, y]) => `${x},${y}`));
  if (occupied.size >= GRID_W * GRID_H) return null;

  while (true) {
    const x = Math.floor(rng() * GRID_W);
    const y = Math.floor(rng() * GRID_H);
    if (!occupied.has(`${x},${y}`)) return [x, y];
  }
}
