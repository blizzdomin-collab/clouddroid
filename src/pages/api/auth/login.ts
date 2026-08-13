import type { APIRoute } from 'astro';
import { getUserByEmail, verifyPassword, createAuditLog, createSession } from '../../../lib/database';
import { verifyTwoFactorCode } from '../../../lib/twofactor';
import { LoginSchema, validate } from '../../../lib/validation';
import { checkRequestSize } from '../../../lib/requestLimits';
import crypto from 'crypto';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

function getRateLimitKey(ip: string): string {
  return `login:${ip}`;
}

function checkRateLimit(ip: string): boolean {
  const key = getRateLimitKey(ip);
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export const POST: APIRoute = async ({ request, cookies, clientAddress }) => {
  try {
    const sizeCheck = checkRequestSize(request);
    if (!sizeCheck.valid) {
      return new Response(JSON.stringify({ error: sizeCheck.error }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ip = clientAddress || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Too many login attempts. Please try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const validation = validate(LoginSchema, body);
    if (!validation.success) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { email, password, code } = validation.data;

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (user.two_factor_enabled) {
      if (!code) {
        return new Response(JSON.stringify({ success: false, requiresTwoFactor: true, message: '2FA code required' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!user.two_factor_secret || !verifyTwoFactorCode(user.two_factor_secret, code)) {
        createAuditLog({
          event: 'Failed 2FA Attempt',
          severity: 'warning',
          instance_id: null,
          user_id: user.id,
          details: `Invalid 2FA code provided from ${ip}`,
          action: 'login_failed',
        });

        return new Response(JSON.stringify({ error: 'Invalid 2FA code' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionRecord = createSession({
      user_id: user.id,
      token: sessionToken,
      ip_address: ip,
      user_agent: request.headers.get('user-agent') || null,
    });

    cookies.set('session', JSON.stringify({ email: user.email, authenticated: true, name: user.name, role: user.role, must_change_password: user.must_change_password, sessionId: sessionRecord.id }), {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    createAuditLog({
      event: 'User Login',
      severity: 'info',
      instance_id: null,
      user_id: user.id,
      details: `Successful login from ${ip}`,
      action: 'login',
    });

    return new Response(JSON.stringify({ success: true, user: { email: user.email, name: user.name, role: user.role, must_change_password: user.must_change_password } }), {
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