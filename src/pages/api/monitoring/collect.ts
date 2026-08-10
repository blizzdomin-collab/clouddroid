import type { APIRoute } from 'astro';
import { getInstances, addMetricHistory } from '../../../lib/database';

function randomVariation(base: number, variance: number): number {
  const variation = (Math.random() - 0.5) * 2 * variance;
  return Math.max(0, Math.min(100, Math.round(base + variation)));
}

export const POST: APIRoute = async () => {
  try {
    const instances = getInstances();
    const now = new Date().toISOString();

    for (const instance of instances) {
      const cpu = randomVariation(instance.cpu || 50, 20);
      const memory = randomVariation(instance.memory || 50, 15);
      const networkIn = Math.max(0, Math.round((instance.network_in || 100) + (Math.random() - 0.5) * 50));
      const networkOut = Math.max(0, Math.round((instance.network_out || 100) + (Math.random() - 0.5) * 50));

      addMetricHistory({
        instance_id: instance.id,
        cpu,
        memory,
        network_in: networkIn,
        network_out: networkOut,
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'Metrics collected', timestamp: now }), {
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
