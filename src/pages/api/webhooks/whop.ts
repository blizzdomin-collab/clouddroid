import type { APIRoute } from 'astro';
import { getCheckoutSessionBySessionId, getUserByEmail, createUser, createSubscription, updateSubscription, createInvoice, createAuditLog, provisionInstancesForUser, getSubscriptionByUserId, hashPassword } from '../../../lib/database';
import crypto from 'crypto';

function verifyWhopSignature(payload: string, signatureHeader: string, timestamp: string, webhookId: string, secret: string): boolean {
  const signature = signatureHeader.replace(/^v1,/, '');
  const signedContent = `${webhookId}.${timestamp}.${payload}`;
  const expected = crypto.createHmac('sha256', secret).update(signedContent).digest('base64');
  if (signature.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const whopWebhookSecret = import.meta.env.WHOP_WEBHOOK_SECRET;
    if (!whopWebhookSecret) {
      console.error('WHOP webhook secret not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payloadBuffer = await request.arrayBuffer();
    const payload = Buffer.from(payloadBuffer).toString('utf8');
    const signatureHeader = request.headers.get('webhook-signature') || '';
    const timestamp = request.headers.get('webhook-timestamp') || '';
    const webhookId = request.headers.get('webhook-id') || '';

    if (!signatureHeader || !timestamp || !webhookId) {
      console.error('WHOP webhook missing signature, timestamp, or webhook-id');
      return new Response(JSON.stringify({ error: 'Missing signature, timestamp, or webhook-id' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!verifyWhopSignature(payload, signatureHeader, timestamp, webhookId, whopWebhookSecret)) {
      console.error('WHOP webhook signature verification failed');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let event: any;
    try {
      event = JSON.parse(payload);
    } catch (parseError) {
      console.error('WHOP webhook JSON parse error:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('WHOP webhook received:', event.type, event.data?.id);

    if (event.type === 'payment.succeeded') {
      const payment = event.data;
      const membership = payment.member || {};
      const metadata = payment.metadata || {};
      const customerEmail = metadata.email;
      const plan = metadata.plan;
      const amount = payment.amount_after_fees || payment.amount || 0;
      const currency = payment.currency || 'USD';
      const membershipId = membership.id;

      if (!customerEmail || !plan) {
        console.error('WHOP payment.succeeded missing email or plan in metadata');
        return new Response(JSON.stringify({ error: 'Missing required metadata' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      let user = getUserByEmail(customerEmail);
      if (!user) {
        const tempPassword = crypto.randomBytes(12).toString('hex');
        user = createUser({
          email: customerEmail,
          password_hash: hashPassword(tempPassword),
          name: customerEmail.split('@')[0],
          role: 'user',
          reset_token: null,
          reset_token_expiry: null,
          must_change_password: true,
          registration_ip: null,
          registration_user_agent: null,
        });

        const subscription = createSubscription({
          user_id: user.id,
          plan,
          status: 'active',
          amount,
          currency,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        });

        createInvoice({
          user_id: user.id,
          subscription_id: subscription.id,
          amount,
          currency,
          status: 'paid',
          due_date: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        });

        createAuditLog({
          event: 'User Created via WHOP Checkout',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `User account created for ${customerEmail} after successful ${plan} purchase via WHOP`,
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
            currency,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
          });
        }

        createInvoice({
          user_id: user.id,
          subscription_id: existingSubscription?.id || null,
          amount,
          currency,
          status: 'paid',
          due_date: now,
          paid_at: now,
        });

        createAuditLog({
          event: 'Subscription Renewed via WHOP',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `Access extended for ${customerEmail} for ${plan} plan via WHOP`,
          action: 'subscription_renew',
        });
      }

      return new Response(JSON.stringify({ received: true, userCreated: !getUserByEmail(customerEmail) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (event.type === 'membership.activated') {
      const membership = event.data;
      const metadata = membership.metadata || {};
      const customerEmail = metadata.email;
      
      if (customerEmail) {
        const user = getUserByEmail(customerEmail);
        if (user) {
          createAuditLog({
            event: 'WHOP Membership Activated',
            severity: 'info',
            instance_id: null,
            user_id: user.id,
            details: `WHOP membership activated for ${customerEmail}`,
            action: 'membership_activate',
          });
        }
      }
      
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (event.type === 'membership.deactivated') {
      const membership = event.data;
      const metadata = membership.metadata || {};
      const customerEmail = metadata.email;
      
      if (customerEmail) {
        const user = getUserByEmail(customerEmail);
        if (user) {
          const subscription = getSubscriptionByUserId(user.id);
          if (subscription) {
            updateSubscription(subscription.id, { status: 'canceled' });
          }

          createAuditLog({
            event: 'WHOP Membership Deactivated',
            severity: 'warning',
            instance_id: null,
            user_id: user.id,
            details: `WHOP membership deactivated for ${customerEmail}`,
            action: 'membership_deactivate',
          });
        }
      }
      
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (event.type === 'payment.failed') {
      const payment = event.data;
      const metadata = payment.metadata || {};
      const customerEmail = metadata.email;
      
      console.log('WHOP payment failed:', payment.id, customerEmail);
      
      if (customerEmail) {
        const user = getUserByEmail(customerEmail);
        if (user) {
          createAuditLog({
            event: 'WHOP Payment Failed',
            severity: 'error',
            instance_id: null,
            user_id: user.id,
            details: `WHOP payment failed for ${customerEmail}: ${payment.id}`,
            action: 'payment_failed',
          });
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
    console.error('WHOP webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
