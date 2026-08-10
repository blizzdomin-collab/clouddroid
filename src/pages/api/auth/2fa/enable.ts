import type { APIRoute } from 'astro';
import { getUserByEmail, updateUser } from '../../../../lib/database';
import { verifyTwoFactorCode } from '../../../../lib/twofactor';

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

    const { code } = await request.json();

    if (!code || !/^\d{6}$/.test(code)) {
      return new Response(JSON.stringify({ error: 'Invalid 2FA code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserByEmail(session.email);
    if (!user || !user.two_factor_secret) {
      return new Response(JSON.stringify({ error: '2FA not set up' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!verifyTwoFactorCode(user.two_factor_secret, code)) {
      return new Response(JSON.stringify({ error: 'Invalid 2FA code' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateUser(user.id, { two_factor_enabled: true });

    return new Response(JSON.stringify({ success: true, message: '2FA enabled successfully' }), {
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
