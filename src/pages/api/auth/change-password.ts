import type { APIRoute } from 'astro';
import { getUserByEmail, verifyPassword, saveToDisk } from '../../../lib/database';

export const POST: APIRoute = async ({ request, cookies }) => {
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

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Current password and new password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'New password must be at least 8 characters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserByEmail(session.email);
    if (!user || !verifyPassword(currentPassword, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Current password is incorrect' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const crypto = await import('crypto');
    const newHash = crypto.createHash('sha256').update(newPassword).digest('hex');

    const { getUsers } = await import('../../../lib/database');
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.id === user.id);
    if (userIndex === -1) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { updateUser } = await import('../../../lib/database');
    updateUser(user.id, { password_hash: newHash, must_change_password: false });
    saveToDisk();

    return new Response(JSON.stringify({ success: true, message: 'Password updated successfully' }), {
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