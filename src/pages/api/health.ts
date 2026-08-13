import type { APIRoute } from 'astro';
import { jsonResponse, corsHeaders } from '../../lib/api';
import { withLogging } from '../../lib/apiMiddleware';

const handler: APIRoute = async () => {
  try {
    const db = (await import('../../lib/database')).default;
    const userCount = db.users?.length || 0;
    const instanceCount = db.instances?.length || 0;

    let redisStatus: string;
    try {
      const redis = (await import('../../lib/redis')).redis;
      await redis.ping();
      redisStatus = 'ok';
    } catch {
      redisStatus = 'unavailable';
    }

    return jsonResponse({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.0.1',
      checks: {
        database: 'ok',
        redis: redisStatus,
        users: userCount,
        instances: instanceCount,
      },
    });
  } catch (error) {
    return jsonResponse({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }, 503);
  }
};

export const GET = withLogging(handler);

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(),
    },
  });
};
