import type { APIRoute } from 'astro';
import { getCheckoutSessionByPaynowPaymentId, updateCheckoutSession, getUserByEmail, createUser, createSubscription, createInvoice, createAuditLog, provisionInstancesForUser, completeCheckout } from '../../../lib/database';
import crypto from 'crypto';

function verifyPayNowSignature(payload: string, timestamp: string, signature: string, secret: string): boolean {
  const timestampInt = parseInt(timestamp, 10);
  if (isNaN(timestampInt)) {
    return false;
  }

  const timestampTime = new Date(timestampInt);
  const currentTime = new Date();
  const tolerancePeriod = 5 * 60 * 1000;

  if (currentTime - timestampTime > tolerancePeriod) {
    return false;
  }

  const payloadWithTimestamp = `${timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadWithTimestamp).digest('base64');

  return crypto.timingSafeEqual(Buffer.from(signature, 'base64'), Buffer.from(expectedSignature, 'base64'));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const paynowWebhookSecret = import.meta.env.PAYNOW_WEBHOOK_KEY;
    if (!paynowWebhookSecret) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const timestamp = request.headers.get('paynow-timestamp') || '';
    const signature = request.headers.get('paynow-signature') || '';

    if (!timestamp || !signature) {
      return new Response(JSON.stringify({ error: 'Missing required headers' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await request.text();

    if (!verifyPayNowSignature(payload, timestamp, signature, paynowWebhookSecret)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const event = JSON.parse(payload);
    const eventType = event.event_type;

    if (eventType === 'ON_ORDER_COMPLETED' || eventType === 'ON_SUBSCRIPTION_ACTIVATED' || eventType === 'ON_SUBSCRIPTION_RENEWED') {
      const order = event.order || event.data || event;
      const checkoutId = order.checkout_id || order.checkoutId || null;
      const paymentId = order.id || order.payment_id || order.paymentId || null;
      const customerEmail = order.billing_email || order.customer_email || order.email || '';
      const totalAmount = order.total_amount || order.amount || 0;
      const currency = order.currency || 'USD';

      if (!customerEmail) {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let checkoutSession = null;

      if (checkoutId) {
        checkoutSession = getCheckoutSessionByPaynowPaymentId(checkoutId);
      }

      if (!checkoutSession && paymentId) {
        checkoutSession = getCheckoutSessionByPaynowPaymentId(paymentId);
      }

      if (!checkoutSession) {
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
      const finalCurrency = currency.toUpperCase();

      if (paymentId && !checkoutSession.paynow_payment_id) {
        updateCheckoutSession(checkoutSession.id, { paynow_payment_id: paymentId, status: 'completed' });
      } else {
        updateCheckoutSession(checkoutSession.id, { status: 'completed' });
      }

      const result = completeCheckout({
        email: customerEmail,
        plan: checkoutSession.plan,
        amount: isNaN(amount) ? 0 : amount,
        currency: finalCurrency,
        gateway: 'paynow',
        tempPassword: checkoutSession.temp_password || undefined,
        customerId: paymentId || undefined,
        checkoutSessionId: checkoutSession.session_id,
      });

      return new Response(JSON.stringify({ received: true, userCreated: result.created }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (eventType === 'ON_REFUND' || eventType === 'ON_CHARGEBACK') {
      const order = event.order || event.data || event;
      const paymentId = order.id || order.payment_id || order.paymentId || null;

      if (paymentId) {
        const checkoutSession = getCheckoutSessionByPaynowPaymentId(paymentId);
        if (checkoutSession && checkoutSession.status !== 'failed') {
          updateCheckoutSession(checkoutSession.id, { status: 'failed' });
        }
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
    console.error('PayNow webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
