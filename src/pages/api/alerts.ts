import type { APIRoute } from 'astro';
import { getAlerts, acknowledgeAlert } from '../../lib/database.ts';

export const GET: APIRoute = async ({ url }) => {
  const alerts = getAlerts();
  const limit = Number(url.searchParams.get('limit') || 10);
  const offset = Number(url.searchParams.get('offset') || 0);
  const severity = url.searchParams.get('severity') || '';
  const type = url.searchParams.get('type') || '';
  const acknowledged = url.searchParams.get('acknowledged') || '';

  let filtered = alerts;

  if (severity) {
    filtered = filtered.filter((a) => a.severity === severity);
  }

  if (type) {
    filtered = filtered.filter((a) => a.type === type);
  }

  if (acknowledged !== '') {
    const ack = acknowledged === 'true' ? 1 : 0;
    filtered = filtered.filter((a) => a.acknowledged === ack);
  }

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const paginatedAlerts = filtered.slice(safeOffset, safeOffset + safeLimit);
  const unacknowledged = filtered.filter((a) => a.acknowledged === 0);

  return new Response(
    JSON.stringify({
      alerts: paginatedAlerts.map((alert) => ({
        ...alert,
        timestamp: new Date(alert.timestamp).toISOString(),
        acknowledged: alert.acknowledged === 1,
      })),
      summary: {
        total: filtered.length,
        unacknowledged: unacknowledged.length,
        critical: filtered.filter((a) => a.severity === 'critical').length,
        warning: filtered.filter((a) => a.severity === 'warning').length,
        info: filtered.filter((a) => a.severity === 'info').length,
      },
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        total: filtered.length,
        hasMore: safeOffset + safeLimit < filtered.length,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { alertId } = await request.json();

    if (!alertId) {
      return new Response(JSON.stringify({ error: 'Alert ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const success = acknowledgeAlert(alertId);

    if (!success) {
      return new Response(JSON.stringify({ error: 'Alert not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
