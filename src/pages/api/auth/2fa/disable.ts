import type { APIRoute } from 'astro';
import { getUserByEmail, updateUser, verifyPassword } from '../../../../lib/database';

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

    const { password, code } = await request.json();

    const user = getUserByEmail(session.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!verifyPassword(password, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Password is incorrect' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (user.two_factor_enabled && code) {
      const { verifyTwoFactorCode } = await import('../../../lib/twofactor');
      if (!user.two_factor_secret || !verifyTwoFactorCode(user.two_factor_secret, code)) {
        return new Response(JSON.stringify({ error: 'Invalid 2FA code' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    updateUser(user.id, {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null,
    });

    return new Response(JSON.stringify({ success: true, message: '2FA disabled successfully' }), {
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
