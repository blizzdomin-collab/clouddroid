import type { APIRoute } from 'astro';
import { getUserById, updateUser, getInstancesByUserId, getSubscriptionsByUserId, getInvoicesByUserId } from '../../../../lib/database';

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserById(id);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const instances = getInstancesByUserId(id);
    const subscriptions = getSubscriptionsByUserId(id);
    const invoices = getInvoicesByUserId(id);

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      suspended: Boolean(user.suspended),
      suspension_reason: user.suspension_reason,
      dodo_customer_id: user.dodo_customer_id,
      registration_ip: user.registration_ip,
      registration_user_agent: user.registration_user_agent,
      two_factor_enabled: Boolean(user.two_factor_enabled),
    };

    return new Response(JSON.stringify({ user: safeUser, instances, subscriptions, invoices }), {
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

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const id = params.id;
    if (!id) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserById(id);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const updates: Record<string, any> = {};

    if (body.role !== undefined) updates.role = body.role;
    if (body.suspended !== undefined) updates.suspended = body.suspended ? 1 : 0;
    if (body.suspension_reason !== undefined) updates.suspension_reason = body.suspension_reason;

    if (!Object.keys(updates).length) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = updateUser(id, updates);
    if (!updated) {
      return new Response(JSON.stringify({ error: 'Failed to update user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, suspended: Boolean(updated.suspended), suspension_reason: updated.suspension_reason } }), {
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
