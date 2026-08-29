import type { APIRoute } from 'astro';
import { getCheckoutSessionBySessionId, getCheckoutSessionByEmail, updateCheckoutSession, getUserByEmail, createUser, createSubscription, updateSubscription, createInvoice, createAuditLog, provisionInstancesForUser, getSubscriptionByUserId, updateUser, hashPassword } from '../../../lib/database';
import crypto from 'crypto';

function verifyEasyTransacSignature(params: Record<string, string>, secret: string): boolean {
  const signature = params.Signature || params.signature || '';
  if (!signature) return false;

  const filtered = Object.entries(params)
    .filter(([key]) => key.toLowerCase() !== 'signature')
    .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const chain = filtered.map(([, value]) => value).join('$');
  const expected = crypto.createHash('sha1').update(`${chain}$${secret}`).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const easytransacWebhookKey = import.meta.env.EASYTRANSAC_WEBHOOK_KEY;
    if (!easytransacWebhookKey) {
      console.error('EasyTransac webhook: EASYTRANSAC_WEBHOOK_KEY not configured');
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const contentType = request.headers.get('content-type') || '';
    let params: Record<string, string> = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.text();
      const parsed = new URLSearchParams(body);
      for (const [key, value] of parsed) {
        params[key] = value;
      }
    } else if (contentType.includes('application/json')) {
      const body = await request.json();
      params = Object.fromEntries(
        Object.entries(body).map(([k, v]) => [k, String(v)])
      );
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!verifyEasyTransacSignature(params, easytransacWebhookKey)) {
      console.error('EasyTransac webhook: Invalid signature', { notificationType: params.NotificationType, tid: params.Tid });
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const notificationType = params.NotificationType || params.notificationType || 'transaction';
    const status = params.Status || params.status || '';
    const tid = params.Tid || params.tid || '';
    const requestId = params.RequestId || params.requestId || '';
    const orderId = params.OrderId || params.orderId || '';
    const amount = parseFloat(params.Amount || params.amount || '0');
    const currency = (params.Currency || params.currency || 'EUR').toUpperCase();
    const customerEmail = params.Email || params.email || '';

    console.log('EasyTransac webhook received:', { notificationType, status, tid, orderId, customerEmail });

    if (notificationType === 'page' || notificationType === 'transaction') {
      if (notificationType === 'page') {
        console.log('EasyTransac page notification:', { requestId, orderId, status });
      }
      if (notificationType === 'transaction' && status !== 'captured' && status !== 'pending') {
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      let checkoutSession = null;

      if (orderId) {
        checkoutSession = getCheckoutSessionBySessionId(orderId);
      }

      if (!checkoutSession && tid) {
        checkoutSession = getCheckoutSessionBySessionId(tid);
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

      const updates: Record<string, any> = { status: 'completed' };
      if (tid && !checkoutSession.easytransac_tid) {
        updates.easytransac_tid = tid;
      }
      updateCheckoutSession(checkoutSession.id, updates);

      const email = customerEmail || checkoutSession.email;
      const plan = checkoutSession.plan;
      const amountValue = isNaN(amount) ? 0 : amount / 100;
      const tempPassword = checkoutSession.temp_password || crypto.randomBytes(12).toString('hex');

      let user = getUserByEmail(email);
      if (!user) {
        const finalPassword = checkoutSession.temp_password || crypto.randomBytes(12).toString('hex');
        user = createUser({
          email,
          password_hash: hashPassword(finalPassword),
          name: email.split('@')[0],
          role: 'user',
          reset_token: null,
          reset_token_expiry: null,
          must_change_password: true,
          easytransac_client_id: params.ClientId || null,
          registration_ip: checkoutSession.ip_address,
          registration_user_agent: checkoutSession.user_agent,
        });

        const subscription = createSubscription({
          user_id: user.id,
          plan,
          status: 'active',
          amount: amountValue,
          currency,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        });

        createInvoice({
          user_id: user.id,
          subscription_id: subscription.id,
          amount: amountValue,
          currency,
          status: 'paid',
          due_date: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        });

        createAuditLog({
          event: 'User Created via Checkout',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `User account created for ${email} after successful ${plan} purchase via EasyTransac`,
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
            currency,
            current_period_start: now,
            current_period_end: periodEnd,
            cancel_at_period_end: false,
          });
        }

        if (params.ClientId && !user.easytransac_client_id) {
          updateUser(user.id, { easytransac_client_id: params.ClientId });
        }

        createInvoice({
          user_id: user.id,
          subscription_id: existingSubscription?.id || null,
          amount: amountValue,
          currency,
          status: 'paid',
          due_date: now,
          paid_at: now,
        });

        createAuditLog({
          event: 'Subscription Renewed via Checkout',
          severity: 'info',
          instance_id: null,
          user_id: user.id,
          details: `Access extended for ${email} for ${plan} plan via EasyTransac`,
          action: 'subscription_renew',
        });
      }

      return new Response(JSON.stringify({ received: true, userCreated: !getUserByEmail(email) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (notificationType === 'transaction' && (status === 'failed' || status === 'cancelled' || status === 'expired')) {
      let checkoutSession = null;
      if (orderId) {
        checkoutSession = getCheckoutSessionBySessionId(orderId);
      }
      if (!checkoutSession && tid) {
        checkoutSession = getCheckoutSessionBySessionId(tid);
      }
      if (checkoutSession && checkoutSession.status !== 'failed') {
        updateCheckoutSession(checkoutSession.id, { status: 'failed' });
      }
    }

    if (notificationType === 'refund' && status === 'refunded') {
      let checkoutSession = null;
      if (tid) {
        checkoutSession = getCheckoutSessionBySessionId(tid);
      }
      if (checkoutSession && checkoutSession.status !== 'refunded') {
        updateCheckoutSession(checkoutSession.id, { status: 'refunded' });
      }
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
}
