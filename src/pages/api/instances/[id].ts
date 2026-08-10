import type { APIRoute } from 'astro';
import { getInstanceById, updateInstance, deleteInstance, createAuditLog } from '../../../lib/database.ts';

export const GET: APIRoute = async ({ params }) => {
  const instance = getInstanceById(params.id);
  if (!instance) {
    return new Response(JSON.stringify({ error: 'Instance not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(instance), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  try {
    const updates = await request.json();
    const instance = updateInstance(params.id, updates);
    if (!instance) {
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify(instance), {
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

export const DELETE: APIRoute = async ({ params }) => {
  const success = deleteInstance(params.id);
  if (!success) {
    return new Response(JSON.stringify({ error: 'Instance not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  createAuditLog({
    event: 'Instance Deleted',
    severity: 'warning',
    instance_id: params.id,
    user_id: null,
    details: `Instance ${params.id} was deleted`,
    action: 'delete',
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
