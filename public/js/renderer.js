export function renderSnake(canvas, state) {
  const ctx = canvas.getContext('2d');
  canvas.width = 600;
  canvas.height = 600;
  const cell = 30;

  // background
  ctx.fillStyle = '#050008';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // subtle grid
  ctx.strokeStyle = 'rgba(163,230,53,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 600; x += cell) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 600); ctx.stroke();
  }
  for (let y = 0; y <= 600; y += cell) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(600, y); ctx.stroke();
  }

  // food
  if (state.food) {
    ctx.fillStyle = '#f97316';
    ctx.shadowColor = 'rgba(249,115,22,0.6)';
    ctx.shadowBlur = 7;
    ctx.beginPath();
    const fx = state.food[0] * cell + cell / 2;
    const fy = state.food[1] * cell + cell / 2;
    ctx.arc(fx, fy, cell / 2 - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // snake body (tail-to-head, so head is drawn last)
  if (state.snake && state.snake.length > 0) {
    const bodyColor = state.alive ? '#4d7c0f' : '#2d1a4a';
    ctx.fillStyle = bodyColor;
    for (let i = 1; i < state.snake.length; i++) {
      const [x, y] = state.snake[i];
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }

    // head
    if (state.alive) {
      ctx.fillStyle = '#a3e635';
      ctx.shadowColor = 'rgba(163,230,53,0.6)';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#4a3d70';
      ctx.shadowBlur = 0;
    }
    const [hx, hy] = state.snake[0];
    ctx.fillRect(hx * cell + 1, hy * cell + 1, cell - 2, cell - 2);
    ctx.shadowBlur = 0;
  }
}
