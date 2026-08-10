import type { APIRoute } from 'astro';
import { getCheckoutSessionBySessionId, updateCheckoutSession, getUserByEmail, createUser, createSubscription, createInvoice, createAuditLog, provisionInstancesForUser } from '../../../lib/database';
import crypto from 'crypto';

function verifyDodoSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const dodoWebhookSecret = import.meta.env.DODO_PAYMENTS_WEBHOOK_KEY;
    if (!dodoWebhookSecret) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await request.text();
    const signature = request.headers.get('x-dodo-signature') || '';

    if (!verifyDodoSignature(payload, signature, dodoWebhookSecret)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(payload);

    if (event.type === 'checkout.session.completed') {
      const sessionId = event.data?.id;
      const customerId = event.data?.customer?.id;
      const customerEmail = event.data?.customer?.email;
      const planName = event.data?.items?.[0]?.price_data?.product_data?.name || 'Unknown';
      const amount = event.data?.items?.[0]?.price_data?.unit_amount || 0;

      if (!sessionId || !customerEmail) {
        return new Response(JSON.stringify({ error: 'Missing session data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const checkoutSession = getCheckoutSessionBySessionId(sessionId);
      if (!checkoutSession) {
        return new Response(JSON.stringify({ error: 'Checkout session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (checkoutSession.status === 'completed') {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      updateCheckoutSession(checkoutSession.id, { status: 'completed' });

      let user = getUserByEmail(customerEmail);
      if (!user) {
        const tempPassword = checkoutSession.temp_password || crypto.randomBytes(12).toString('hex');
        user = createUser({
          email: customerEmail,
          password_hash: crypto.createHash('sha256').update(tempPassword).digest('hex'),
          name: customerEmail.split('@')[0],
          role: 'user',
          reset_token: null,
          reset_token_expiry: null,
          must_change_password: true,
          dodo_customer_id: customerId || null,
        });

        const planMap: Record<string, string> = {
          'CloudDroid Developer Plan': 'Developer',
          'CloudDroid Professional Plan': 'Professional',
          'CloudDroid Team Plan': 'Team',
        };
        const plan = planMap[planName] || 'Professional';

        const subscription = createSubscription({
          user_id: user.id,
          plan,
          status: 'active',
          amount: amount / 100,
          currency: 'USD',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        });

        createInvoice({
          user_id: user.id,
          subscription_id: subscription.id,
          amount: amount / 100,
          currency: 'USD',
          status: 'paid',
          due_date: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        });

        createAuditLog({
          event: 'User Created via Checkout',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `User account created for ${customerEmail} after successful ${planName} subscription`,
          action: 'user_create',
        });

        provisionInstancesForUser(user.id, plan);
      }

      return new Response(JSON.stringify({ received: true, userCreated: !getUserByEmail(customerEmail) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
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
