import type { APIRoute } from 'astro';
import { getUserByEmail, updateUser } from '../../../../lib/database';
import { generateTwoFactorSecret, generateBackupCodes } from '../../../../lib/twofactor';

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

    const user = getUserByEmail(session.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { secret, otpauthUrl } = generateTwoFactorSecret();
    const backupCodes = generateBackupCodes();

    updateUser(user.id, {
      two_factor_secret: secret,
      two_factor_backup_codes: backupCodes,
    });

    return new Response(
      JSON.stringify({
        success: true,
        secret,
        otpauthUrl,
        backupCodes,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
