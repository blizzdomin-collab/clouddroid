import type { APIRoute } from 'astro';
import { getNotificationChannels, createNotificationChannel, deleteNotificationChannel } from '../../../lib/database';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const channels = getNotificationChannels(session.email);
    return new Response(JSON.stringify({ success: true, channels }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { type, name, config, enabled } = await request.json();

    if (!type || !name || !config) {
      return new Response(JSON.stringify({ error: 'Type, name, and config are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { getUserByEmail } = await import('../../lib/database');
    const user = getUserByEmail(session.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const channel = createNotificationChannel({
      user_id: user.id,
      type,
      name,
      config,
      enabled: enabled ?? true,
    });

    return new Response(JSON.stringify({ success: true, channel }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ cookies, request }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = await request.json().catch(() => ({ id: null }));
    if (!id) {
      return new Response(JSON.stringify({ error: 'Channel ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const channels = getNotificationChannels(session.email);
    const channel = channels.find((c) => c.id === id);
    if (!channel) {
      return new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    deleteNotificationChannel(id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
