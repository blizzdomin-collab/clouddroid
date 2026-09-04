import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const key = process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  stripeClient = new Stripe(key, { apiVersion: '2024-06-20' });
  return stripeClient;
}

export function getStripeWebhookSecret(): string {
  return (
    process.env.STRIPE_WEBHOOK_SECRET ||
    import.meta.env.STRIPE_WEBHOOK_SECRET ||
    ''
  );
}

export function getConsultingSuccessUrl(): string {
  return (
    process.env.CONSULTING_SUCCESS_URL ||
    import.meta.env.CONSULTING_SUCCESS_URL ||
    'https://consulting.clouddroid.eu/success.html?session_id={CHECKOUT_SESSION_ID}'
  );
}

export function getConsultingCancelUrl(): string {
  return (
    process.env.CONSULTING_CANCEL_URL ||
    import.meta.env.CONSULTING_CANCEL_URL ||
    'https://consulting.clouddroid.eu/cancel.html'
  );
}

export const CONSULTING_PACKAGES: Record<
  string,
  { name: string; description: string; priceGbp: number; deliveryDays: number; stripeProductId?: string }
> = {
  starter: {
    name: 'Clouddroid FinOps — Starter Audit',
    description:
      'One-off fixed fee. Infrastructure spend review, cost optimisation report, executive summary, and a 1-hour debrief call.',
    priceGbp: 49900,
    deliveryDays: 10,
    stripeProductId: process.env.STRIPE_PRODUCT_STARTER || 'prod_VCLGnjrclNXd66',
  },
  professional: {
    name: 'Clouddroid FinOps — Professional Engagement',
    description:
      'One-off fixed fee. Everything in Starter plus IT budget strategy session, vendor negotiation support, 3-month follow-up review, and priority email support.',
    priceGbp: 99900,
    deliveryDays: 20,
    stripeProductId: process.env.STRIPE_PRODUCT_PROFESSIONAL || 'prod_VCLGJnoBN4qRpf',
  },
  enterprise: {
    name: 'Clouddroid FinOps — Enterprise Programme',
    description:
      'One-off fixed fee. Everything in Professional plus full FinOps implementation, governance framework design, team training workshop, and a 6-month support package.',
    priceGbp: 249900,
    deliveryDays: 45,
    stripeProductId: process.env.STRIPE_PRODUCT_ENTERPRISE || 'prod_VCLHv5qJE1APfr',
  },
};
