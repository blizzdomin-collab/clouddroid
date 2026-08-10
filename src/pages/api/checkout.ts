import type { APIRoute } from 'astro';
import { createCheckoutSession } from '../../lib/database';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { planId, customerEmail } = await request.json();

    const planConfig: Record<string, { name: string; price: number; interval: string }> = {
      developer: { name: 'Developer', price: 4900, interval: 'month' },
      professional: { name: 'Professional', price: 14900, interval: 'month' },
      team: { name: 'Team', price: 39900, interval: 'month' },
    };

    const plan = planConfig[planId];
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dodoApiKey = import.meta.env.DODO_PAYMENTS_API_KEY;
    if (!dodoApiKey) {
      return new Response(JSON.stringify({ error: 'Payment configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.dodopayments.com/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          email: customerEmail,
        },
        items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `CloudDroid ${plan.name} Plan`,
              },
              unit_amount: plan.price,
              recurring: {
                interval: plan.interval,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${import.meta.env.DODO_PAYMENTS_RETURN_URL}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${new URL(request.headers.get('origin') || 'http://localhost:4321').origin}/checkout/cancel`,
        mode: 'subscription',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: 'Failed to create checkout session', details: error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = await response.json();

    const tempPassword = crypto.randomBytes(12).toString('hex');

    createCheckoutSession({
      session_id: session.id,
      email: customerEmail,
      plan: plan.name,
      status: 'pending',
      temp_password: tempPassword,
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
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
