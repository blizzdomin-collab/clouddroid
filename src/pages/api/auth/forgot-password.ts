import type { APIRoute } from 'astro';
import { getUserByEmail } from '../../../lib/database';
import { checkRateLimit } from '../../../lib/rateLimit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const ip = clientAddress || 'unknown';
    if (!checkRateLimit(`forgot-password:${ip}`, 5, 15 * 60 * 1000)) {
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email } = await request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserByEmail(email);
    if (!user) {
      return new Response(JSON.stringify({ success: true, message: 'If an account exists, a reset link will be sent' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const crypto = await import('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const db = (await import('../../../lib/database')).default;
    const userIndex = db.users.findIndex((u) => u.id === user.id);
    if (userIndex !== -1) {
      db.users[userIndex].reset_token = resetToken;
      db.users[userIndex].reset_token_expiry = resetExpiry;
      const { saveToDisk } = await import('../../../lib/database');
      saveToDisk();
    }

    return new Response(JSON.stringify({ success: true, message: 'If an account exists, a reset link will be sent', token: resetToken }), {
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