import type { APIRoute } from 'astro';
import { getInstances, addMetricHistory, createAlert } from '../../../lib/database';
import { redis } from '../../../lib/redis';

function randomVariation(base: number, variance: number): number {
  const variation = (Math.random() - 0.5) * 2 * variance;
  return Math.max(0, Math.min(100, Math.round(base + variation)));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const serviceToken = import.meta.env.MONITORING_SERVICE_TOKEN;
    if (!serviceToken) {
      return new Response(JSON.stringify({ error: 'Service token not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (token !== serviceToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const instances = getInstances();
    const now = new Date().toISOString();

    for (const instance of instances) {
      const cpu = randomVariation(instance.cpu || 50, 20);
      const memory = randomVariation(instance.memory || 50, 15);
      const networkIn = Math.max(0, Math.round((instance.network_in || 100) + (Math.random() - 0.5) * 50));
      const networkOut = Math.max(0, Math.round((instance.network_out || 100) + (Math.random() - 0.5) * 50));

      const metric = addMetricHistory({
        instance_id: instance.id,
        cpu,
        memory,
        network_in: networkIn,
        network_out: networkOut,
      });

      await redis.publish('metrics', JSON.stringify({
        instance_id: instance.id,
        cpu,
        memory,
        network_in: networkIn,
        network_out: networkOut,
        timestamp: now,
      }));

      if (cpu > 95) {
        const alert = createAlert({
          type: 'cpu',
          severity: 'critical',
          title: 'Sustained High CPU Usage',
          message: `Instance ${instance.name} has maintained >95% CPU usage. Possible cryptocurrency mining activity.`,
          instance_id: instance.id,
          acknowledged: 0,
        });
        await redis.publish('alerts', JSON.stringify(alert));
      }

      if (networkOut > 1000) {
        const alert = createAlert({
          type: 'network',
          severity: 'warning',
          title: 'Unusual Outbound Traffic',
          message: `Instance ${instance.name} showing ${networkOut} Mbps outbound traffic. Threshold: 1000 Mbps.`,
          instance_id: instance.id,
          acknowledged: 0,
        });
        await redis.publish('alerts', JSON.stringify(alert));
      }
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
