import type { APIRoute } from 'astro';
import { getAlerts } from '../../../lib/database';

export const GET: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get('session');
  if (!sessionCookie) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email) {
      return new Response('Unauthorized', { status: 401 });
    }
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: Record<string, unknown>) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      send({ type: 'connected', message: 'SSE connection established' });

      const interval = setInterval(() => {
        const alerts = getAlerts();
        const recentAlerts = alerts.slice(0, 10);
        send({ type: 'alerts', data: recentAlerts });
      }, 5000);

      const keepAlive = setInterval(() => {
        send({ type: 'ping' });
      }, 30000);

      (controller as unknown as { closed: boolean }).closed = false;
      const originalClose = controller.close.bind(controller);
      controller.close = () => {
        clearInterval(interval);
        clearInterval(keepAlive);
        (controller as unknown as { closed: boolean }).closed = true;
        originalClose();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
};
