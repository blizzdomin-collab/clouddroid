import type { APIRoute } from 'astro';
import { getCheckoutSessionByMolliePaymentId, updateCheckoutSession, getUserByEmail, createUser, createSubscription, updateSubscription, createInvoice, createAuditLog, provisionInstancesForUser, getSubscriptionByUserId, updateUser } from '../../../lib/database';
import crypto from 'crypto';

function verifyMollieSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const signature = signatureHeader.replace(/^sha256=/, '');
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function getMolliePayment(paymentId: string, apiKey: string, environment: string): Promise<any> {
  const baseUrl = environment === 'test' ? 'https://api.mollie.nl' : 'https://api.mollie.com';
  const response = await fetch(`${baseUrl}/v2/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const mollieWebhookSecret = import.meta.env.MOLLIE_WEBHOOK_KEY;
    const mollieApiKey = import.meta.env.MOLLIE_API_KEY;
    const environment = import.meta.env.MOLLIE_ENVIRONMENT || 'live';

    if (!mollieWebhookSecret) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload = await request.text();
    const signatureHeader = request.headers.get('X-Mollie-Signature') || '';

    if (!verifyMollieSignature(payload, signatureHeader, mollieWebhookSecret)) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let paymentId: string | null = null;
    let paymentStatus: string | null = null;
    let customerEmail = '';
    let amount = 0;
    let currency = 'EUR';
    let mollieCustomerId: string | null = null;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const event = JSON.parse(payload);

      if (event.resource === 'event' && event._embedded?.entity) {
        const entity = event._embedded.entity;

        if (entity.resource === 'payment' || event.type?.startsWith('payment.')) {
          paymentId = entity.id || event.entityId;
          paymentStatus = entity.status;
          customerEmail = entity.details?.consumer?.email || entity.billingEmail || '';
          amount = parseFloat(entity.amount?.value || '0');
          currency = entity.amount?.currency || 'EUR';
          mollieCustomerId = entity.customerId || null;
        }
      } else if (event.resource === 'payment') {
        paymentId = event.id;
        paymentStatus = event.status;
        customerEmail = event.details?.consumer?.email || event.billingEmail || '';
        amount = parseFloat(event.amount?.value || '0');
        currency = event.amount?.currency || 'EUR';
        mollieCustomerId = event.customerId || null;
      }
    } else {
      const params = new URLSearchParams(payload);
      paymentId = params.get('id');
    }

    if (!paymentId) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const checkoutSession = getCheckoutSessionByMolliePaymentId(paymentId);
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

    if (!paymentStatus && mollieApiKey) {
      const payment = await getMolliePayment(paymentId, mollieApiKey, environment);
      if (payment) {
        paymentStatus = payment.status;
        customerEmail = customerEmail || payment.details?.consumer?.email || payment.billingEmail || '';
        amount = amount || parseFloat(payment.amount?.value || '0');
        currency = payment.amount?.currency || 'EUR';
        mollieCustomerId = mollieCustomerId || payment.customerId || null;
      }
    }

    if (paymentStatus === 'paid' || paymentStatus === 'completed') {
      updateCheckoutSession(checkoutSession.id, { status: 'completed' });

      const email = customerEmail || checkoutSession.email;
      const plan = checkoutSession.plan;
      const amountValue = amount || parseFloat(checkoutSession.amount || '0');
      const currencyValue = currency || 'EUR';
      const tempPassword = checkoutSession.temp_password || crypto.randomBytes(12).toString('hex');

      let user = getUserByEmail(email);
      if (!user) {
        user = createUser({
          email,
          password_hash: crypto.createHash('sha256').update(tempPassword).digest('hex'),
          name: email.split('@')[0],
          role: 'user',
          reset_token: null,
          reset_token_expiry: null,
          must_change_password: true,
          mollie_customer_id: mollieCustomerId,
          registration_ip: checkoutSession.ip_address,
          registration_user_agent: checkoutSession.user_agent,
        });

        const subscription = createSubscription({
          user_id: user.id,
          plan,
          status: 'active',
          amount: amountValue,
          currency: currencyValue,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        });

        createInvoice({
          user_id: user.id,
          subscription_id: subscription.id,
          amount: amountValue,
          currency: currencyValue,
          status: 'paid',
          due_date: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        });

        createAuditLog({
          event: 'User Created via Checkout',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `User account created for ${email} after successful ${plan} purchase via Mollie`,
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
            amount: amountValue,
            currency: currencyValue,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
          });
        }

        if (mollieCustomerId && !user.mollie_customer_id) {
          updateUser(user.id, { mollie_customer_id: mollieCustomerId });
        }

        createInvoice({
          user_id: user.id,
          subscription_id: existingSubscription?.id || null,
          amount: amountValue,
          currency: currencyValue,
          status: 'paid',
          due_date: now,
          paid_at: now,
        });

        createAuditLog({
          event: 'Subscription Renewed via Checkout',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `Access extended for ${email} for ${plan} plan via Mollie`,
          action: 'subscription_renew',
        });
      }

      return new Response(JSON.stringify({ received: true, userCreated: !getUserByEmail(email) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (paymentStatus === 'failed' || paymentStatus === 'canceled' || paymentStatus === 'expired') {
      updateCheckoutSession(checkoutSession.id, { status: 'failed' });
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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
