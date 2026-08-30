import type { APIRoute } from 'astro';
import { getCheckoutSessionBySessionId, updateCheckoutSession, getUserByEmail, createUser, createSubscription, updateSubscription, createInvoice, createAuditLog, provisionInstancesForUser, getSubscriptionByUserId } from '../../../lib/database';
import crypto from 'crypto';

function verifyDodoSignature(payload: string, signatureHeader: string, timestamp: string, secret: string): boolean {
  const signature = signatureHeader.replace(/^v1,/, '');
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', secretBytes).update(`${timestamp}.${payload}`).digest('base64');
  if (signature.length !== expected.length) {
    console.error('Dodo signature length mismatch:', signature.length, 'vs', expected.length);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const dodoWebhookSecret = import.meta.env.DODO_PAYMENTS_WEBHOOK_KEY;
    if (!dodoWebhookSecret) {
      console.error('Dodo webhook secret not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.log('Dodo webhook secret length:', dodoWebhookSecret.length);

    const payload = await request.text();
    const signatureHeader = request.headers.get('webhook-signature') || '';
    const timestamp = request.headers.get('webhook-timestamp') || '';
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('Dodo webhook headers:', JSON.stringify(allHeaders));
    console.log('Dodo webhook signature length:', signatureHeader.length);

    if (!signatureHeader || !timestamp) {
      console.error('Dodo webhook missing signature or timestamp');
      return new Response(JSON.stringify({ error: 'Missing signature or timestamp' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!verifyDodoSignature(payload, signatureHeader, timestamp, dodoWebhookSecret)) {
      console.error('Dodo webhook signature verification failed. Check that DODO_PAYMENTS_WEBHOOK_KEY matches the webhook secret in Dodo Payments dashboard.');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let event: any;
    try {
      event = JSON.parse(payload);
    } catch (parseError) {
      console.error('Dodo webhook JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Dodo webhook received:', event.type, event.data?.id);

    if (event.type === 'checkout.session.completed') {
      const sessionId = event.data?.id;
      const customerId = event.data?.customer?.id;

      if (!sessionId) {
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

      const customerEmail = event.data?.customer?.email || checkoutSession.email;
      const plan = checkoutSession.plan;
      const amount = (event.data?.amount_total || event.data?.items?.[0]?.price_data?.unit_amount || 0) / 100;
      const tempPassword = checkoutSession.temp_password || crypto.randomBytes(12).toString('hex');

      let user = getUserByEmail(customerEmail);
      if (!user) {
        user = createUser({
          email: customerEmail,
          password_hash: crypto.createHash('sha256').update(tempPassword).digest('hex'),
          name: customerEmail.split('@')[0],
          role: 'user',
          reset_token: null,
          reset_token_expiry: null,
          must_change_password: true,
          dodo_customer_id: customerId || null,
          registration_ip: checkoutSession.ip_address,
          registration_user_agent: checkoutSession.user_agent,
        });

        const subscription = createSubscription({
          user_id: user.id,
          plan,
          status: 'active',
          amount,
          currency: 'USD',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        });

        createInvoice({
          user_id: user.id,
          subscription_id: subscription.id,
          amount,
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
          details: `User account created for ${customerEmail} after successful ${plan} purchase`,
          action: 'user_create',
        });

        provisionInstancesForUser(user.id, plan);
      } else {
        const existingSubscription = getSubscriptionByUserId(user.id);
        const now = new Date().toISOString();
        const periodEnd = existingSubscription && new Date(existingSubscription.current_period_end) > new Date()
          ? new Date(new Date(existingSubscription.current_period_end).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        if (existingSubscription) {
          updateSubscription(existingSubscription.id, {
            status: 'active',
            current_period_start: now,
            current_period_end: periodEnd,
          });
        } else {
          createSubscription({
            user_id: user.id,
            plan,
            status: 'active',
            amount,
            currency: 'USD',
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
          });
        }

        if (customerId && !user.dodo_customer_id) {
          updateUser(user.id, { dodo_customer_id: customerId });
        }

        createInvoice({
          user_id: user.id,
          subscription_id: existingSubscription?.id || null,
          amount,
          currency: 'USD',
          status: 'paid',
          due_date: now,
          paid_at: now,
        });

        createAuditLog({
          event: 'Subscription Renewed via Checkout',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `Access extended for ${customerEmail} for ${plan} plan via Dodo Payments`,
          action: 'subscription_renew',
        });
      }

      return new Response(JSON.stringify({ received: true, userCreated: !getUserByEmail(customerEmail) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (event.type === 'payment.failed') {
      console.log('Payment failed event:', event.data?.id, event.data?.customer?.email);
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
    console.error('Dodo webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
