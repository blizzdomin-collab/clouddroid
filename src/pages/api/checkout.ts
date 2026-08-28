import type { APIRoute } from 'astro';
import { createCheckoutSession } from '../../lib/database';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const { planId, customerEmail, gateway = 'dodo' } = await request.json();

    const ipAddress = clientAddress || null;
    const userAgent = request.headers.get('user-agent') || null;

    const planConfig: Record<string, { name: string; productId: string; mollieAmount: string; paynowProductId: string }> = {
      developer: { name: 'Developer', productId: 'pdt_0Nl5L3f80oqubD1vFBGeV', mollieAmount: '49.00', paynowProductId: '596937594697154560' },
      professional: { name: 'Professional', productId: 'pdt_0Nl5Kr9NhpcLZ7C5KJFOo', mollieAmount: '149.00', paynowProductId: '596937714155134976' },
      team: { name: 'Team', productId: 'pdt_0Nl5K2bcCSXCritV0N8lN', mollieAmount: '399.00', paynowProductId: '596937843687821312' },
    };

    const selectedPlan = planConfig[planId];
    if (!selectedPlan) {
      return new Response(JSON.stringify({ error: 'Invalid plan' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (gateway === 'mollie') {
      const mollieApiKey = import.meta.env.MOLLIE_API_KEY;
      if (!mollieApiKey) {
        return new Response(JSON.stringify({ error: 'Payment configuration error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const environment = import.meta.env.MOLLIE_ENVIRONMENT || 'live';
      const baseUrl = environment === 'test' ? 'https://api.mollie.nl' : 'https://api.mollie.com';

      const response = await fetch(`${baseUrl}/v2/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mollieApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: {
            currency: 'EUR',
            value: selectedPlan.mollieAmount,
          },
          description: `CloudDroid ${selectedPlan.name} Plan`,
          redirectUrl: import.meta.env.MOLLIE_RETURN_URL || 'https://clouddroid.eu/checkout/success',
          webhookUrl: 'https://clouddroid.eu/api/webhooks/mollie',
          metadata: {
            plan: selectedPlan.name,
            email: customerEmail,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return new Response(JSON.stringify({ error: 'Failed to create Mollie payment', details: error }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const payment = await response.json();
      const tempPassword = crypto.randomBytes(12).toString('hex');

      createCheckoutSession({
        session_id: payment.id,
        email: customerEmail,
        plan: selectedPlan.name,
        status: 'pending',
        temp_password: tempPassword,
        ip_address: ipAddress,
        user_agent: userAgent,
        payment_gateway: 'mollie',
        mollie_payment_id: payment.id,
      });

      return new Response(JSON.stringify({ checkout_url: payment._links?.checkout?.href, sessionId: payment.id, gateway: 'mollie' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (gateway === 'paynow') {
      const paynowApiKey = import.meta.env.PAYNOW_API_KEY;
      if (!paynowApiKey) {
        return new Response(JSON.stringify({ error: 'Payment configuration error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const environment = import.meta.env.PAYNOW_ENVIRONMENT || 'live';
      const baseUrl = environment === 'test' ? 'https://api.sandbox.paynow.gg' : 'https://api.paynow.gg';
      const storeId = '596937251510820864';

      const customerResponse = await fetch(`${baseUrl}/v1/stores/${storeId}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `apikey ${paynowApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: customerEmail,
          metadata: {
            email: customerEmail,
            plan: selectedPlan.name,
          },
        }),
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('PayNow customer creation failed:', customerResponse.status, errorText);
        return new Response(JSON.stringify({ error: 'Failed to create PayNow customer', details: errorText }), {
          status: customerResponse.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const customer = await customerResponse.json();

      const response = await fetch(`${baseUrl}/v1/stores/${storeId}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `apikey ${paynowApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          lines: [
            {
              product_id: selectedPlan.paynowProductId,
              quantity: 1,
            },
          ],
          return_url: import.meta.env.PAYNOW_RETURN_URL || 'https://clouddroid.eu/checkout/success',
          metadata: {
            plan: selectedPlan.name,
            email: customerEmail,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('PayNow checkout failed:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'Failed to create PayNow checkout', details: errorText }), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const session = await response.json();
      const tempPassword = crypto.randomBytes(12).toString('hex');

      createCheckoutSession({
        session_id: session.id,
        email: customerEmail,
        plan: selectedPlan.name,
        status: 'pending',
        temp_password: tempPassword,
        ip_address: ipAddress,
        user_agent: userAgent,
        payment_gateway: 'paynow',
        paynow_payment_id: session.id,
        paynow_customer_id: customer.id,
      });

      return new Response(JSON.stringify({ checkout_url: session.url, sessionId: session.id, gateway: 'paynow' }), {
        status: 200,
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
            product_id: selectedPlan.productId,
            quantity: 1,
          },
        ],
        customer: {
          email: customerEmail,
        },
        return_url: import.meta.env.DODO_PAYMENTS_RETURN_URL || 'https://clouddroid.eu/checkout/success',
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
      plan: selectedPlan.name,
      status: 'pending',
      temp_password: tempPassword,
      ip_address: ipAddress,
      user_agent: userAgent,
      payment_gateway: 'dodo',
    });

    return new Response(JSON.stringify({ checkout_url: session.checkout_url, sessionId: session.session_id, gateway: 'dodo' }), {
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
