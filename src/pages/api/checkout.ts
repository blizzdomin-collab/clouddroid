import type { APIRoute } from 'astro';
import { createCheckoutSession } from '../../lib/database';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { planId, customerEmail } = await request.json();

    const planConfig: Record<string, { name: string; productId: string }> = {
      developer: { name: 'Developer', productId: 'pdt_0Nl5L3f80oqubD1vFBGeV' },
      professional: { name: 'Professional', productId: 'pdt_0Nl5Kr9NhpcLZ7C5KJFOo' },
      team: { name: 'Team', productId: 'pdt_0Nl5K2bcCSXCritV0N8lN' },
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

    const environment = import.meta.env.DODO_PAYMENTS_ENVIRONMENT || 'live_mode';
    const baseUrl = environment === 'test_mode' ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

    const response = await fetch(`${baseUrl}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_cart: [
          {
            product_id: plan.productId,
            quantity: 1,
          },
        ],
        customer: {
          email: customerEmail,
        },
        return_url: import.meta.env.DODO_PAYMENTS_RETURN_URL,
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
      session_id: session.session_id,
      email: customerEmail,
      plan: plan.name,
      status: 'pending',
      temp_password: tempPassword,
    });

    return new Response(JSON.stringify({ checkout_url: session.checkout_url, sessionId: session.session_id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
