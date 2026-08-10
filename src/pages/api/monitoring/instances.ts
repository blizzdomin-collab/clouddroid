import type { APIRoute } from 'astro';
import { getInstances } from '../../../lib/database.ts';

export const GET: APIRoute = async () => {
  const instances = getInstances();
  const anomalies = instances.filter((inst) => inst.cpu > 95 || inst.network_out > 1000);

  return new Response(
    JSON.stringify({
      instances: instances.map((inst) => ({
        ...inst,
        alerts: inst.cpu > 95 ? [`High CPU usage detected: ${inst.cpu}%`] : [],
        lastChecked: inst.updated_at,
      })),
      summary: {
        total: instances.length,
        running: instances.filter((i) => i.status === 'running').length,
        warnings: instances.filter((i) => i.status === 'warning').length,
        anomalies: anomalies.length,
      },
      anomalies: anomalies.map((inst) => ({
        ...inst,
        alerts: [
          ...(inst.cpu > 95 ? [`High CPU usage detected: ${inst.cpu}%`] : []),
          ...(inst.network_out > 1000 ? [`Unusual outbound traffic spike: ${inst.network_out} Mbps`] : []),
        ],
      })),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
