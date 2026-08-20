import type { APIRoute } from 'astro';
import { verifyResetToken, clearResetToken, hashPassword, getUserByEmail, updateUser } from '../../../lib/database';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ error: 'Token and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (password.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { user, valid } = verifyResetToken(token);
    if (!valid || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired reset token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    updateUser(user.id, {
      password_hash: hashPassword(password),
    });
    clearResetToken(user.id);

    return new Response(JSON.stringify({ success: true, message: 'Password reset successfully' }), {
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
