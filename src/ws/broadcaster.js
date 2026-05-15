import { WebSocketServer } from 'ws';

export class Broadcaster {
  constructor(httpServer, gameManager) {
    this.wss = new WebSocketServer({ noServer: true });
    this.gameManager = gameManager;
    this.clients = new Set();

    httpServer.on('upgrade', (req, socket, head) => {
      if (req.url === '/ws') {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      const snapshot = [...gameManager.activeGames.entries()].map(([gameId, g]) => ({
        gameId,
        botId: g.botId,
        state: g.state
      }));
      ws.send(JSON.stringify({ event: 'snapshot', data: { activeGames: snapshot } }));

      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });

    gameManager.on('game:start', (e) => this.broadcast('game:start', e));
    gameManager.on('game:move', (e) => this.broadcast('game:move', e));
    gameManager.on('game:end', (e) => this.broadcast('game:end', e));
  }

  broadcast(event, data) {
    const msg = JSON.stringify({ event, data });
    for (const ws of this.clients) {
      if (ws.readyState === 1) {
        try { ws.send(msg); } catch { /* swallow disconnected client */ }
      }
    }
  }

  close() {
    for (const ws of this.clients) ws.close();
    this.wss.close();
  }
}
