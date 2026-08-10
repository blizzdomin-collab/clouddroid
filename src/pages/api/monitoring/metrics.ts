import type { APIRoute } from 'astro';
import { getMetricsHistory } from '../../../lib/database';

export const GET: APIRoute = async ({ url }) => {
  try {
    const instanceId = url.searchParams.get('instance_id');
    const metrics = getMetricsHistory(instanceId || undefined);
    return new Response(JSON.stringify({ metrics }), {
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