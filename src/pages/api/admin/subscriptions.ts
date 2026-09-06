import type { APIRoute } from 'astro';
import { getSubscriptions, getUsers, updateSubscription, getInvoicesByUserId } from '../../../lib/database';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const subscriptions = getSubscriptions();
    const users = getUsers();
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = subscriptions.map((sub) => {
      const user = userMap.get(sub.user_id);
      const invoices = getInvoicesByUserId(sub.user_id);
      const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;
      return {
        ...sub,
        user: user ? { id: user.id, email: user.email, name: user.name, role: user.role } : null,
        paidInvoices,
        totalInvoices: invoices.length,
      };
    });

    return new Response(JSON.stringify({ subscriptions: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { subscription_id, action, days, plan, amount, currency } = body;

    if (!subscription_id || !action) {
      return new Response(JSON.stringify({ error: 'subscription_id and action are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'cancel') {
      const updated = updateSubscription(subscription_id, { status: 'canceled', cancel_at_period_end: true });
      if (!updated) return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, subscription: updated }));
    }

    if (action === 'extend') {
      const daysToAdd = Number(days) || 30;
      const sub = getSubscriptions().find((s) => s.id === subscription_id);
      if (!sub) return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      const newEnd = new Date(sub.current_period_end);
      newEnd.setDate(newEnd.getDate() + daysToAdd);
      const updated = updateSubscription(subscription_id, { current_period_end: newEnd.toISOString(), status: 'active' });
      return new Response(JSON.stringify({ success: true, subscription: updated }));
    }

    if (action === 'update') {
      const updates: any = {};
      if (plan) updates.plan = plan;
      if (amount !== undefined) updates.amount = Number(amount);
      if (currency) updates.currency = currency;
      const updated = updateSubscription(subscription_id, updates);
      if (!updated) return new Response(JSON.stringify({ error: 'Subscription not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, subscription: updated }));
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
