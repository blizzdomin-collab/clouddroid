import type { APIRoute } from 'astro';
import { getInstances, getUserByEmail } from '../../../lib/database';
import { getCached, invalidateCache } from '../../../lib/redis';

export const GET: APIRoute = async ({ cookies }) => {
  let userFilter: string | null = null;
  const sessionCookie = cookies.get('session');
  if (sessionCookie) {
    try {
      const session = JSON.parse(sessionCookie.value);
      if (session.authenticated && session.email) {
        const user = getUserByEmail(session.email);
        if (user && user.role !== 'admin') {
          userFilter = user.id;
        }
      }
    } catch {
      // ignore session parse errors
    }
  }

  const instances = await getCached(
    'monitoring:instances',
    async () => {
      const data = getInstances();
      const filtered = userFilter ? data.filter((inst) => inst.user_id === userFilter) : data;
      const anomalies = filtered.filter((inst) => inst.cpu > 95 || inst.network_out > 1000);

      return {
        instances: filtered.map((inst) => ({
          ...inst,
          alerts: inst.cpu > 95 ? [`High CPU usage detected: ${inst.cpu}%`] : [],
          lastChecked: inst.updated_at,
        })),
        summary: {
          total: filtered.length,
          running: filtered.filter((i) => i.status === 'running').length,
          warnings: filtered.filter((i) => i.status === 'warning').length,
          anomalies: anomalies.length,
        },
        anomalies: anomalies.map((inst) => ({
          ...inst,
          alerts: [
            ...(inst.cpu > 95 ? [`High CPU usage detected: ${inst.cpu}%`] : []),
            ...(inst.network_out > 1000 ? [`Unusual outbound traffic spike: ${inst.network_out} Mbps`] : []),
          ],
        })),
      };
    },
    30
  );

  return new Response(JSON.stringify(instances), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
