// Stripe Consulting Integration Test
//
// 1. Ensure `.env` has STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET set
//
// 2. Start dev server in one terminal:
//      astro dev
//
// 3. Run this in another terminal (Node 22+):
//      node --env-file=.env scripts/test-stripe-consulting.mjs professional
//
//    It will POST to http://localhost:4321/api/consulting/checkout and print the Stripe URL.
//
// 4. Open the URL, use test card 4242 4242 4242 4242, any future date, any CVC.
//
// 5. After payment Stripe redirects to success.html and POSTs to /api/consulting/webhook.
//
// To test webhook locally with Stripe CLI:
//    stripe listen --forward-to localhost:4321/api/consulting/webhook
//    Copy the whsec_... from CLI output into STRIPE_WEBHOOK_SECRET and restart dev server.

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:4321';
const pkg = process.argv[2] || 'professional';

const r = await fetch(`${baseUrl}/api/consulting/checkout`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ package: pkg }),
});

console.log('Status:', r.status);
const body = await r.json().catch(() => r.text());
console.log('Body:', body);
