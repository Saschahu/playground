export const GRID_W = 20;
export const GRID_H = 20;
export const INITIAL_LENGTH = 3;
export const MAX_TICKS = 1000;
export const SCORE_PER_FOOD = 10;
export const SCORE_PER_TICK = 1;
export const DIRECTIONS = ['up', 'down', 'left', 'right'];

export const DIR_VECTORS = {
  up:    [0, -1],
  down:  [0,  1],
  left:  [-1, 0],
  right: [1,  0]
};

export const OPPOSITE = {
  up: 'down', down: 'up', left: 'right', right: 'left'
};
