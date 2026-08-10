import type { APIRoute } from 'astro';
import { createUser, getUserByEmail } from '../../../lib/database';
import { checkRateLimit } from '../../../lib/rateLimit';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const ip = clientAddress || 'unknown';
    if (!checkRateLimit(`register:${ip}`, 5, 15 * 60 * 1000)) {
      return new Response(JSON.stringify({ error: 'Too many registration attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Name, email, and password are required' }), {
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

    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const crypto = await import('crypto');
    const password_hash = crypto.createHash('sha256').update(password).digest('hex');

    const user = createUser({
      email,
      password_hash,
      name,
      role: 'user',
    });

    return new Response(JSON.stringify({ success: true, message: 'Account created successfully', user: { email: user.email, name: user.name } }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};