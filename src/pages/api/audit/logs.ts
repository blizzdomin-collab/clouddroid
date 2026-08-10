import type { APIRoute } from 'astro';
import { getAuditLogs } from '../../../lib/database.ts';

export const GET: APIRoute = async ({ url }) => {
  const logs = getAuditLogs();
  const limit = Number(url.searchParams.get('limit') || 10);
  const offset = Number(url.searchParams.get('offset') || 0);
  const severity = url.searchParams.get('severity') || '';
  const instanceId = url.searchParams.get('instance_id') || '';
  const search = url.searchParams.get('search') || '';
  const startDate = url.searchParams.get('start_date') || '';
  const endDate = url.searchParams.get('end_date') || '';

  let filtered = logs;

  if (severity) {
    filtered = filtered.filter((l) => l.severity === severity);
  }

  if (instanceId) {
    filtered = filtered.filter((l) => l.instance_id === instanceId);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((l) => l.event.toLowerCase().includes(q) || l.details.toLowerCase().includes(q) || l.action.toLowerCase().includes(q));
  }

  if (startDate) {
    const start = new Date(startDate);
    filtered = filtered.filter((l) => new Date(l.timestamp) >= start);
  }

  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter((l) => new Date(l.timestamp) <= end);
  }

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safeOffset = Math.max(offset, 0);
  const paginatedLogs = filtered.slice(safeOffset, safeOffset + safeLimit);
  const summary = {
    total: filtered.length,
    critical: filtered.filter((l) => l.severity === 'critical').length,
    warnings: filtered.filter((l) => l.severity === 'warning').length,
    info: filtered.filter((l) => l.severity === 'info').length,
  };

  return new Response(
    JSON.stringify({
      logs: paginatedLogs.map((log) => ({
        ...log,
        timestamp: new Date(log.timestamp).toISOString(),
      })),
      summary,
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
