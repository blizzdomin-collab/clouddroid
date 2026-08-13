import type { APIRoute } from 'astro';
import { deleteSession } from '../../../lib/database';

export const POST: APIRoute = async ({ cookies }) => {
  const sessionCookie = cookies.get('session');
  let deleted = false;

  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);
      const sessionId = session.sessionId;
      if (sessionId) {
        deleted = deleteSession(sessionId);
      }
    } catch {
      // ignore
    }
  }

  cookies.delete('session', { path: '/' });
  return new Response(JSON.stringify({ success: true, sessionDeleted: deleted }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
