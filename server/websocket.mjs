import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import Redis from 'ioredis';

const PORT = parseInt(process.env.WS_PORT || '4322');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL);

const server = createServer();
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

const clients = new Set<WebSocket>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  if (url.pathname !== '/ws') {
    ws.close(1008, 'Invalid path');
    return;
  }

  clients.add(ws);
  console.log(`WebSocket client connected. Total: ${clients.size}`);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

export function broadcast(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

redis.subscribe('alerts', 'metrics', (err) => {
  if (err) {
    console.error('Redis subscribe error:', err);
    return;
  }
  console.log('Subscribed to Redis channels: alerts, metrics');
});

redis.on('message', (channel, message) => {
  if (channel === 'alerts') {
    broadcast({ type: 'alert', data: JSON.parse(message) });
  } else if (channel === 'metrics') {
    broadcast({ type: 'metrics', data: JSON.parse(message) });
  }
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});
