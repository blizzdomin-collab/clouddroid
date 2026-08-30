import type { APIRoute } from 'astro';
import { db } from '../../../lib/database';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checks: Record<string, { status: string; detail?: string }> = {};

    try {
      db.prepare('SELECT 1').get();
      checks.database = { status: 'healthy' };
    } catch (e) {
      checks.database = { status: 'unhealthy', detail: e instanceof Error ? e.message : 'Unknown error' };
    }

    let redisStatus: Record<string, { status: string; detail?: string }> = { status: 'unknown', detail: 'Redis client not initialized' };
    try {
      const redisModule = await import('ioredis');
      const Redis = redisModule.default;
      const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
      await redis.ping();
      redisStatus = { status: 'healthy' };
      await redis.quit();
    } catch (e) {
      redisStatus = { status: 'unhealthy', detail: e instanceof Error ? e.message : 'Unknown error' };
    }
    checks.redis = redisStatus;

    const overall = Object.values(checks).every((c) => c.status === 'healthy') ? 'healthy' : 'degraded';

    return new Response(JSON.stringify({ overall, checks }), {
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
