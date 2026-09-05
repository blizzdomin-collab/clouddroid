import type { APIRoute } from 'astro';
import { getCheckoutSessionBySessionId, getCheckoutSessionByEmail, updateCheckoutSession, completeCheckout } from '../../../lib/database';
import crypto from 'crypto';

function verifyCreemSignature(payload: string, signature: string, secret: string): boolean {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  if (computed.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signature, 'hex'));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const creemWebhookSecret = import.meta.env.CREEM_WEBHOOK_SECRET;
    if (!creemWebhookSecret) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const signature = request.headers.get('creem-signature') || '';
    if (!signature) {
      return new Response(JSON.stringify({ error: 'Missing creem-signature header' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await request.text();

    if (!verifyCreemSignature(payload, signature, creemWebhookSecret)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(payload);
    const eventType = event.eventType;
    const obj = event.object || {};

    if (eventType === 'checkout.completed' || eventType === 'subscription.active' || eventType === 'subscription.paid') {
      const checkoutId = obj.id || null;
      const order = obj.order || {};
      const customer = obj.customer || {};
      const customerEmail = customer.email || order.metadata?.email || obj.metadata?.email || '';
      const totalAmount = order.amount || obj.amount || 0;
      const currency = order.currency || obj.currency || 'USD';
      const customerId = customer.id || null;

      if (!customerEmail && !checkoutId) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let checkoutSession = null;
      if (checkoutId) {
        checkoutSession = getCheckoutSessionBySessionId(checkoutId);
      }
      if (!checkoutSession && customerEmail) {
        checkoutSession = getCheckoutSessionByEmail(customerEmail);
      }

      if (!checkoutSession) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (checkoutSession.status === 'completed') {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const amount = typeof totalAmount === 'number' ? totalAmount / 100 : parseFloat(totalAmount) / 100;

      updateCheckoutSession(checkoutSession.id, { status: 'completed' });

      const result = completeCheckout({
        email: customerEmail || checkoutSession.email,
        plan: checkoutSession.plan,
        amount: isNaN(amount) ? 0 : amount,
        currency: String(currency).toUpperCase(),
        gateway: 'creem',
        tempPassword: checkoutSession.temp_password || undefined,
        customerId: customerId || undefined,
        checkoutSessionId: checkoutSession.session_id,
      });

      return new Response(JSON.stringify({ received: true, userCreated: result.created }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (eventType === 'refund.created' || eventType === 'dispute.created' || eventType === 'subscription.canceled') {
      const checkoutId = obj.id || obj.checkout?.id || null;
      let checkoutSession = null;
      if (checkoutId) {
        checkoutSession = getCheckoutSessionBySessionId(checkoutId);
      }
      if (checkoutSession && checkoutSession.status !== 'failed') {
        updateCheckoutSession(checkoutSession.id, { status: 'failed' });
      }
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Creem webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
