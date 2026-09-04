import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
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

    const body = await request.json().catch(() => ({}));
    const pkgId = String(body?.package || '');
    const cfg = CONSULTING_PACKAGES[pkgId];
    if (!cfg) {
      return new Response(JSON.stringify({ error: 'Unknown package' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Optional promotion code from frontend (e.g. ?promo=LAUNCH10 or via direct POST)
    // When pre-applied, the customer cannot remove it in Checkout UI.
    const promotionCode = typeof body?.promotion_code === 'string' ? body.promotion_code.trim() : undefined;

  try {
    const stripe = getStripe();
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
      invoice_creation: { enabled: true },
      // Customer can always enter a different code; we still pre-apply if provided
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      tax_id_collection: { enabled: true },
      custom_fields: [
        {
          key: 'first_name',
          label: { type: 'custom', custom: 'First name' },
          type: 'text',
          text: { minimum_length: 1, maximum_length: 50 },
          optional: false,
        },
        {
          key: 'last_name',
          label: { type: 'custom', custom: 'Last name' },
          type: 'text',
          text: { minimum_length: 1, maximum_length: 50 },
          optional: false,
        },
        {
          key: 'job_title',
          label: { type: 'custom', custom: 'Job title / Role' },
          type: 'text',
          text: { minimum_length: 1, maximum_length: 80 },
          optional: false,
        },
        {
          key: 'company_name',
          label: { type: 'custom', custom: 'Company name' },
          type: 'text',
          text: { minimum_length: 1, maximum_length: 100 },
          optional: false,
        },
        {
          key: 'company_registration',
          label: { type: 'custom', custom: 'Company registration number (optional)' },
          type: 'text',
          text: { minimum_length: 0, maximum_length: 30 },
          optional: true,
        },
        {
          key: 'business_type',
          label: { type: 'custom', custom: 'Business type' },
          type: 'dropdown',
          dropdown: {
            options: [
              { label: 'Private limited company (Ltd)', value: 'ltd' },
              { label: 'Limited liability partnership (LLP)', value: 'llp' },
              { label: 'Sole trader / self-employed', value: 'sole_trader' },
              { label: 'Partnership', value: 'partnership' },
              { label: 'Public limited company (PLC)', value: 'plc' },
              { label: 'Charity / non-profit', value: 'charity' },
              { label: 'Other', value: 'other' },
            ],
          },
          optional: false,
        },
        {
          key: 'referral_source',
          label: { type: 'custom', custom: 'How did you hear about us? (optional)' },
          type: 'dropdown',
          dropdown: {
            options: [
              { label: 'Google search', value: 'google' },
              { label: 'LinkedIn', value: 'linkedin' },
              { label: 'Referral / word of mouth', value: 'referral' },
              { label: 'Industry event or conference', value: 'event' },
              { label: 'Article or blog post', value: 'content' },
              { label: 'Other', value: 'other' },
            ],
          },
          optional: true,
        },
        {
          key: 'terms_accepted',
          label: {
            type: 'custom',
            custom: 'I confirm I am acting in the course of business and accept the Terms & Conditions and Privacy Policy',
          },
          type: 'checkbox',
          checkbox: { required: true },
          optional: false,
        },
      ],
      // Stripe Radar options for risk evaluation
      // Radar runs by default; this just gives it more data to score
      payment_intent_data: {
        description: cfg.name,
        metadata: {
          package_id: pkgId,
          company_number: '16993940',
          service_type: 'finops_consulting',
        },
        statement_descriptor: 'CLOUDDROID FINOPS',
        // Capture funds immediately (do not pre-authorize)
        capture_method: 'automatic',
        // Use 'automatic' confirmation so Radar can block in real time
        confirmation_method: 'automatic',
      },
      metadata: {
        package_id: pkgId,
        company: 'PRIME CONSULTING GROUP LTD',
        company_number: '16993940',
        service_type: 'finops_consulting',
        // Compliance trace fields
        seller_name: 'PRIME CONSULTING GROUP LTD',
        seller_country: 'GB',
        seller_regulator: 'Not FCA / PRA regulated',
      },
      // Restrict to common B2B countries (UK + EU + US + CA + AU)
      shipping_address_collection: undefined,
    };

    // Pre-apply promotion code if provided (lock the customer into this discount)
    if (promotionCode) {
      sessionParams.discounts = [{ promotion_code: promotionCode }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

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
