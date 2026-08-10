import type { APIRoute } from 'astro';
import { getAuditLogs } from '../../../lib/database';

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
    if (!session.authenticated || !session.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const logs = getAuditLogs();

    const headers = ['Timestamp', 'Event', 'Severity', 'Instance ID', 'User ID', 'Details', 'Action'];
    const csvRows = [headers.join(',')];

    logs.forEach((log: any) => {
      const row = [
        log.timestamp,
        `"${(log.event || '').replace(/"/g, '""')}"`,
        log.severity,
        log.instance_id || '',
        log.user_id || '',
        `"${(log.details || '').replace(/"/g, '""')}"`,
        log.action,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
