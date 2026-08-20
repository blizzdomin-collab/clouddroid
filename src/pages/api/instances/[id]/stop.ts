import type { APIRoute } from 'astro';
import { getInstanceById, updateInstance, createAuditLog, getUserByEmail } from '../../../../lib/database';

export const POST: APIRoute = async ({ params, cookies }) => {
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

    const user = getUserByEmail(session.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const instance = getInstanceById(params.id);
    if (!instance) {
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (instance.user_id !== user.id && user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = updateInstance(params.id, { status: 'stopped', cpu: 0, memory: 0, network_in: 0, network_out: 0 });

    createAuditLog({
      event: 'Instance Stopped',
      severity: 'warning',
      instance_id: params.id,
      user_id: user.id,
      details: `${instance.name} stopped by ${user.email}`,
      action: 'stop',
    });

    return new Response(JSON.stringify(updated), {
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
