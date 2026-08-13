import type { APIRoute } from 'astro';
import { getAuditLogs } from '../../../lib/database';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let userId: string | null = null;
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.authenticated && session.email) {
        const { getUserByEmail } = await import('../../../lib/database');
        const user = getUserByEmail(session.email);
        userId = user?.id || null;
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const logs = getAuditLogs();
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 20), 1), 100);
    const offset = Math.max(Number(url.searchParams.get('offset') || 0), 0);

    const authEvents = ['login', 'login_failed', 'logout', 'password_change', '2fa_enabled', '2fa_disabled', 'user_create'];
    let filtered = logs.filter((l) => l.user_id === userId && authEvents.includes(l.action));

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const paginated = filtered.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        logs: paginated.map((log) => ({
          ...log,
          timestamp: new Date(log.timestamp).toISOString(),
        })),
        pagination: {
          limit,
          offset,
          total: filtered.length,
          hasMore: offset + limit < filtered.length,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
