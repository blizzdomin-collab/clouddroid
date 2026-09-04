import type { APIRoute } from 'astro';
import {
  CONSULTING_PACKAGES,
  getStripe,
  getConsultingCancelUrl,
  getConsultingSuccessUrl,
} from '../../../lib/stripe';

const RATE_BUCKET = new Map<string, { start: number; count: number }>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;

function rateLimit(req: Request, clientAddress: string | undefined): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() || clientAddress || 'unknown';
  const now = Date.now();
  const entry = RATE_BUCKET.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    RATE_BUCKET.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_MAX;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!rateLimit(request, clientAddress)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const pkgId = String(body?.package || '');
    const cfg = CONSULTING_PACKAGES[pkgId];
    if (!cfg) {
      return new Response(JSON.stringify({ error: 'Unknown package' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      currency: 'gbp',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            product: cfg.stripeProductId,
            unit_amount: cfg.priceGbp,
          },
        },
      ],
      success_url: getConsultingSuccessUrl(),
      cancel_url: getConsultingCancelUrl(),
      customer_creation: 'always',
      // Generate a Stripe invoice automatically for every successful payment
      invoice_creation: { enabled: true },
      payment_intent_data: {
        description: cfg.name,
        metadata: {
          package_id: pkgId,
          company_number: '16993940',
          service_type: 'finops_consulting',
        },
        statement_descriptor: 'CLOUDDROID FINOPS',
      },
      metadata: {
        package_id: pkgId,
        company: 'PRIME CONSULTING GROUP LTD',
        company_number: '16993940',
        service_type: 'finops_consulting',
      },
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    console.error('consulting checkout error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' },
  });
};
