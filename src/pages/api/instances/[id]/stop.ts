import type { APIRoute } from 'astro';
import { getInstanceById, updateInstance, createAuditLog } from '../../../../lib/database.ts';

export const POST: APIRoute = async ({ params }) => {
  const instance = getInstanceById(params.id);
  if (!instance) {
    return new Response(JSON.stringify({ error: 'Instance not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updated = updateInstance(params.id, { status: 'stopped', cpu: 0, memory: 0, network_in: 0, network_out: 0 });

  createAuditLog({
    event: 'Instance Stopped',
    severity: 'warning',
    instance_id: params.id,
    user_id: null,
    details: `${instance.name} stopped by user`,
    action: 'stop',
  });

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
