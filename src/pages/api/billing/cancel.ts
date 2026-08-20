import type { APIRoute } from 'astro';
import { getSubscriptionByUserId, updateSubscription, createAuditLog } from '../../../lib/database';

export const POST: APIRoute = async ({ cookies, request }) => {
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

    const db = (await import('../../../lib/database')).default;
    const user = db.users.find((u: any) => u.email === session.email);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscription = getSubscriptionByUserId(user.id);
    if (!subscription) {
      return new Response(JSON.stringify({ error: 'No active subscription found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { cancelAtPeriodEnd = true } = await request.json().catch(() => ({ cancelAtPeriodEnd: true }));

    const updated = updateSubscription(subscription.id, {
      cancel_at_period_end: cancelAtPeriodEnd ? 1 : 0,
      status: cancelAtPeriodEnd ? 'active' : 'canceled',
    });

    createAuditLog({
      event: cancelAtPeriodEnd ? 'Subscription Cancel Scheduled' : 'Subscription Cancelled',
      severity: 'warning',
      instance_id: null,
      user_id: user.id,
      details: `Subscription ${subscription.id} for ${user.email} ${cancelAtPeriodEnd ? 'scheduled for cancellation at period end' : 'cancelled immediately'}`,
      action: 'subscription_cancel',
    });

    return new Response(JSON.stringify({ success: true, subscription: updated }), {
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
