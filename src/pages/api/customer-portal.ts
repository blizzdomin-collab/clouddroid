import type { APIRoute } from 'astro';
import { getUserByEmail } from '../../lib/database';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = getUserByEmail(session.email);
    if (!user?.dodo_customer_id && !user?.mollie_customer_id) {
      return new Response(JSON.stringify({ error: 'No payment customer ID found for this account' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (user?.mollie_customer_id && !user?.dodo_customer_id) {
      return new Response(JSON.stringify({ error: 'Mollie does not provide a customer portal. Please contact support to manage your subscription.' }), {
        status: 501,
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

    const response = await fetch(
      `${baseUrl}/customers/${encodeURIComponent(user.dodo_customer_id)}/customer-portal/session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dodoApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: `${url.origin}/dashboard/billing`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return new Response(JSON.stringify({ error: 'Failed to create portal session', details: error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ url: data.url }), {
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
