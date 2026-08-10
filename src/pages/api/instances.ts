import type { APIRoute } from 'astro';
import { createInstance, createAuditLog } from '../../lib/database.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, platform, ram, storage } = body;

    if (!name || !platform || !ram || !storage) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const instance = createInstance({
      name,
      platform,
      ram: Number(ram),
      storage: Number(storage),
      status: 'running',
      cpu: 0,
      memory: 0,
      network_in: 0,
      network_out: 0,
    });

    createAuditLog({
      event: 'Instance Created',
      severity: 'info',
      instance_id: instance.id,
      user_id: null,
      details: `${instance.name} provisioned successfully`,
      action: 'provision',
    });

    return new Response(JSON.stringify(instance), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
