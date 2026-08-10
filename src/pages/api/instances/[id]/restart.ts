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

  const updated = updateInstance(params.id, { status: 'running', cpu: 0, memory: 0, network_in: 0, network_out: 0 });

  createAuditLog({
    event: 'Instance Restarted',
    severity: 'info',
    instance_id: params.id,
    user_id: null,
    details: `${instance.name} restarted successfully`,
    action: 'restart',
  });

  return new Response(JSON.stringify(updated), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
