import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', '..', 'public');

export function createHttpApp(mcpServerFactory, apiRouter) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.all('/mcp', async (req, res) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined  // stateless mode
      });
      const server = mcpServerFactory();
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      console.error('mcp error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    }
  });

  if (apiRouter) {
    app.use('/api', apiRouter);
  }

  // html-pages (app.use statt app.get — Express 5 / path-to-regexp v8 compat)
  app.get('/', (req, res) => res.sendFile(join(PUBLIC_DIR, 'index.html')));
  app.use('/bot', (req, res) => res.sendFile(join(PUBLIC_DIR, 'bot.html')));
  app.use('/replay', (req, res) => res.sendFile(join(PUBLIC_DIR, 'replay.html')));

  app.use(express.static(PUBLIC_DIR));

  return app;
}
