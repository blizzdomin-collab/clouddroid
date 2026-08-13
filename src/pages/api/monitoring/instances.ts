import type { APIRoute } from 'astro';
import { getInstances } from '../../../lib/database.ts';
import { getCached, invalidateCache } from '../../../lib/redis.ts';

export const GET: APIRoute = async () => {
  const instances = await getCached(
    'monitoring:instances',
    async () => {
      const data = getInstances();
      const anomalies = data.filter((inst) => inst.cpu > 95 || inst.network_out > 1000);

      return {
        instances: data.map((inst) => ({
          ...inst,
          alerts: inst.cpu > 95 ? [`High CPU usage detected: ${inst.cpu}%`] : [],
          lastChecked: inst.updated_at,
        })),
        summary: {
          total: data.length,
          running: data.filter((i) => i.status === 'running').length,
          warnings: data.filter((i) => i.status === 'warning').length,
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
