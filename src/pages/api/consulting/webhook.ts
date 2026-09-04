import type { APIRoute } from 'astro';
import { getStripe, getStripeWebhookSecret } from '../../../lib/stripe';

const SEEN_SESSIONS = new Map<string, number>();
const SESSION_TTL_MS = 60 * 60 * 1000;

function cleanSeen() {
  const now = Date.now();
  for (const [k, v] of SEEN_SESSIONS) {
    if (now - v > SESSION_TTL_MS) SEEN_SESSIONS.delete(k);
  }
}
if (typeof setInterval !== 'undefined') {
  setInterval(cleanSeen, 5 * 60 * 1000).unref?.();
}

export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    return new Response('Webhook secret not configured', { status: 500 });
  }

  const sig = request.headers.get('stripe-signature') || '';
  const rawBody = await request.text();

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    return new Response('Stripe not configured', { status: 500 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid';
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        if (SEEN_SESSIONS.has(session.id)) break;
        SEEN_SESSIONS.set(session.id, Date.now());

        const customerEmail = session.customer_details?.email;
        const amountTotal = session.amount_total;
        const pkgId = session.metadata?.package_id;
        console.log(
          JSON.stringify({
            event: 'checkout.session.completed',
            session_id: session.id,
            package: pkgId,
            email: customerEmail,
            amount_total: amountTotal,
            currency: session.currency,
            payment_status: session.payment_status,
            ts: new Date().toISOString(),
          })
        );
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as any;
        console.warn(
          JSON.stringify({
            event: 'payment_intent.payment_failed',
            id: pi.id,
            last_payment_error: pi.last_payment_error?.message,
            ts: new Date().toISOString(),
          })
        );
        break;
      }
      case 'charge.refunded': {
        const ch = event.data.object as any;
        console.log(
          JSON.stringify({
            event: 'charge.refunded',
            id: ch.id,
            amount_refunded: ch.amount_refunded,
            ts: new Date().toISOString(),
          })
        );
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'handler error';
    return new Response(`Webhook handler error: ${msg}`, { status: 500 });
  }
};
