export function renderSnake(canvas, state) {
  const ctx = canvas.getContext(2d);
  canvas.width = 600;
  canvas.height = 600;
  const cell = 30;

  // clear
  ctx.fillStyle = #1a1a1a;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // food
  if (state.food) {
    ctx.fillStyle = #ef4444;
    ctx.fillRect(state.food[0] * cell + 1, state.food[1] * cell + 1, cell - 2, cell - 2);
  }

  // snake body
  ctx.fillStyle = state.alive ? #4ade80 : #555;
  for (const [x, y] of state.snake) {
    ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
  }

  // head highlight
  if (state.alive && state.snake.length > 0) {
    ctx.fillStyle = #86efac;
    const [hx, hy] = state.snake[0];
    ctx.fillRect(hx * cell + 1, hy * cell + 1, cell - 2, cell - 2);
  }
}
