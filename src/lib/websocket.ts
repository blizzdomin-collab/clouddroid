import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import Redis from 'ioredis';

const PORT = parseInt(process.env.WS_PORT || '4322');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const server = createServer();
const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
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

redis.subscribe('alerts', (err) => {
  if (err) {
    console.error('Redis subscribe error:', err);
    return;
  }
  console.log('Subscribed to Redis channel: alerts');
});

redis.on('message', (channel, message) => {
  if (channel === 'alerts') {
    broadcast({ type: 'alert', data: JSON.parse(message) });
  }
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});
