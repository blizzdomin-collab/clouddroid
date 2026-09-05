# CloudDroid

Enterprise-grade cloud Android workspaces for QA automation, app testing, and secure remote productivity.

## 🚀 Tech Stack

- **Framework:** Astro 7.2 with Node.js adapter
- **Styling:** Tailwind CSS v4
- **Database:** SQLite via `better-sqlite3` (`.data/clouddroid.db`)
- **Cache/Realtime:** Redis (`ioredis`) + WebSocket server (`ws`)
- **Payments:** Dodo Payments + Mollie + PayNow + Creem + EasyTransac
- **Deployment:** PM2 + Nginx + Let's Encrypt SSL
- **Auto-deploy:** GitHub Actions on push to `main`

## 📁 Project Structure

```
├── src/
│   ├── layouts/
│   │   ├── Layout.astro          # Root layout with Inter font, OG meta, JSON-LD
│   │   └── DashboardLayout.astro # Authenticated dashboard shell
│   ├── pages/
│   │   ├── index.astro           # Marketing homepage
│   │   ├── about.astro           # About page
│   │   ├── pricing.astro         # Pricing page with annual toggle + comparison table
│   │   ├── faq.astro             # Frequently asked questions (FAQPage JSON-LD)
│   │   ├── contact.astro         # Contact form + info
│   │   ├── status.astro          # System status / uptime
│   │   ├── business.astro        # KYB/business verification info
│   │   ├── security.astro        # Security overview
│   │   ├── security-disclosure.astro # Vulnerability disclosure
│   │   ├── sla.astro             # Service Level Agreement
│   │   ├── dpa.astro             # Data Processing Agreement
│   │   ├── changelog.astro       # Public changelog (announcements)
│   │   ├── how-it-works.astro    # Onboarding / how-it-works guide
│   │   ├── api-docs.astro        # API documentation
│   │   ├── login.astro           # Login page
│   │   ├── register.astro        # Registration page
│   │   ├── forgot-password.astro # Password reset request
│   │   ├── reset-password.astro  # Password reset form
│   │   ├── change-password.astro # Forced password change
│   │   ├── 404.astro, 500.astro  # Error pages
│   │   ├── dashboard/            # Authenticated dashboard pages
│   │   │   ├── index.astro       # Overview
│   │   │   ├── instances.astro   # Instance management
│   │   │   ├── monitoring.astro  # Metrics & charts
│   │   │   ├── compliance.astro  # Audit logs
│   │   │   ├── alerts.astro      # Real-time alerts
│   │   │   ├── billing.astro     # Subscription & invoices
│   │   │   ├── users.astro       # Admin user management
│   │   │   ├── admin.astro       # Admin dashboard with stats and charts
│   │   │   ├── activity.astro    # Login history
│   │   │   ├── settings.astro    # Profile, 2FA, notifications, dark mode
│   │   │   └── instances/[id].astro # Instance detail with metrics
│   │   ├── checkout/             # Checkout flow
│   │   │   ├── [plan].astro      # Plan checkout page
│   │   │   ├── success.astro     # Payment success + credentials
│   │   │   └── cancel.astro      # Payment cancel
│   │   ├── legal/                # Legal & compliance pages
│   │   │   ├── terms.astro
│   │   │   ├── privacy.astro
│   │   │   ├── aup.astro
│   │   │   ├── refund.astro
│   │   │   ├── subprocessors.astro
│   │   │   └── aml.astro
│   │   └── api/                  # API routes
│   │       ├── auth/             # Login, logout, register, password reset, 2FA, activity, sessions
│   │       ├── checkout.ts       # Dodo Payments + Mollie + PayNow + Creem + EasyTransac checkout session
│   │       ├── contact.ts        # Contact form submission
│   │       ├── announcements.ts  # Public announcements feed
│   │       ├── webhooks/         # Dodo Payments + Mollie + PayNow + Creem + EasyTransac webhooks
│   │       ├── instances/        # Instance CRUD + actions + detail
│   │       ├── monitoring/       # Metrics, collect, charts
│   │       ├── audit/            # Logs, export CSV
│   │       ├── alerts/           # Alerts + SSE stream
│   │       ├── billing/          # Subscription, invoices
│   │       ├── admin/            # User management + admin stats
│   │       ├── notifications/    # Notification channels
│   │       └── health.ts         # Health check
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── TrustStrip.astro
│   │   ├── Features.astro
│   │   ├── UseCases.astro
│   │   ├── ProductShowcase.astro
│   │   ├── Pricing.astro
│   │   ├── Announcements.astro   # User-facing announcement banner
│   │   └── Breadcrumbs.astro     # SEO breadcrumb navigation
│   ├── lib/
│   │   ├── database.ts           # SQLite DB with CRUD
│   │   ├── database-sqlite.ts    # SQLite implementation
│   │   ├── redis.ts              # Redis client + cache helpers
│   │   ├── validation.ts         # Zod schemas
│   │   ├── logger.ts             # Structured logging
│   │   ├── apiMiddleware.ts      # Request logging wrapper
│   │   ├── twofactor.ts          # TOTP 2FA support
│   │   ├── rateLimit.ts          # In-memory rate limiter
│   │   ├── requestLimits.ts      # Request size limits
│   │   └── api.ts                # CORS + JSON helpers
│   └── styles/
│       └── global.css            # Tailwind v4 theme
├── server/
│   └── websocket.mjs             # WebSocket server for real-time updates
├── deploy/
│   ├── ecosystem.config.cjs      # PM2 production config
│   ├── nginx.conf                # Nginx reverse proxy template
│   └── scripts/
│       └── deploy.sh             # VPS deployment script
├── .github/workflows/
│   └── deploy.yml                # GitHub Actions auto-deploy
├── .env.example                  # Environment variables template
├── astro.config.mjs              # Astro + Tailwind + Node adapter
├── package.json
├── clouddroid-master-blueprint.md # Compliance/KYB master blueprint
└── consulting/                   # Static consulting site for consulting.clouddroid.eu
    ├── index.html                # Landing page
    ├── contact.html              # Contact page with mailto form
    ├── terms.html                # Terms & Conditions
    ├── privacy.html              # Privacy Policy
    ├── refund.html               # Refund & Cancellation Policy
    ├── css/
    │   └── styles.css
    └── js/
        └── main.js
```

## 🧞 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server at `localhost:4321` |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |
| `astro dev --background` | Start dev server in background |
| `astro dev stop` | Stop background dev server |
| `astro dev status` | Check dev server status |
| `astro dev logs` | View dev server logs |

## 🔐 Environment Variables

```env
DODO_PAYMENTS_API_KEY=your-api-key
DODO_PAYMENTS_WEBHOOK_KEY=your-webhook-secret
DODO_PAYMENTS_ENVIRONMENT=live_mode
DODO_PAYMENTS_RETURN_URL=https://clouddroid.eu/checkout/success
MOLLIE_API_KEY=your-mollie-api-key
MOLLIE_ENVIRONMENT=live
MOLLIE_RETURN_URL=https://clouddroid.eu/checkout/success
PAYNOW_API_KEY=your-paynow-api-key
PAYNOW_WEBHOOK_KEY=your-paynow-webhook-secret
PAYNOW_ENVIRONMENT=live
PAYNOW_RETURN_URL=https://clouddroid.eu/checkout/success
STRIPE_SECRET_KEY=sk_live_your-stripe-secret
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-signing-secret
STRIPE_PRODUCT_TRIAL=prod_your-trial-product
STRIPE_PRODUCT_STARTER=prod_your-starter-product
STRIPE_PRODUCT_PROFESSIONAL=prod_your-professional-product
STRIPE_PRODUCT_ENTERPRISE=prod_your-enterprise-product
CONSULTING_SUCCESS_URL=https://consulting.clouddroid.eu/success.html
CONSULTING_CANCEL_URL=https://consulting.clouddroid.eu/cancel.html
REDIS_URL=redis://localhost:6379
WS_PORT=4322
```

## 🚢 Deployment

Production runs on VPS with:
- Node.js 22+
- PM2 process manager (2 processes: app + WebSocket server)
- Nginx reverse proxy with WebSocket proxy
- Redis for caching and pub/sub
- Let's Encrypt SSL (`clouddroid.eu`)

Auto-deploy via GitHub Actions on push to `main`.

## 🌐 Consulting Subdomain

Static B2B consulting site hosted on `consulting.clouddroid.eu`:
- Company: RUNESTONE HANDLUNG s.r.o.
- Services: FinOps audits, IT budget strategy, cloud financial management
- Legal pages: Terms & Conditions, Privacy Policy, Refund Policy
- Nginx serves static files from `/var/www/clouddroid/consulting`
- SSL via Let's Encrypt

## 💳 Payment Gateways

### Dodo Payments
- Webhook endpoint: `/api/webhooks/dodopayments`
- Environment variables: `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT=live_mode`, `DODO_PAYMENTS_RETURN_URL=https://clouddroid.eu/checkout/success`
- Checkout endpoint: `POST /checkouts` with `product_cart`
- Customer portal endpoint: `POST /customers/{customer_id}/customer-portal/session`
- Subscribed events: checkout.session.completed, subscription.active, subscription.cancelled, subscription.renewed, payment.succeeded, payment.failed, refund.succeeded
- Account status: Fully approved, live mode activated
- **Webhook signature algorithm (IMPORTANT):** Dodo does NOT use the standard Svix format. The signed content is `webhook-id + "." + webhook-timestamp + "." + raw-payload-body`, HMAC-SHA256 with the base64-decoded secret (strip the `whsec_` prefix first). Signature header is `webhook-signature` with format `v1,<base64>`. Verify with `crypto.timingSafeEqual`.

### Mollie
- Webhook endpoint: `/api/webhooks/mollie`
- Environment variables: `MOLLIE_API_KEY`, `MOLLIE_ENVIRONMENT=live`, `MOLLIE_RETURN_URL=https://clouddroid.eu/checkout/success`
- Payments endpoint: `POST https://api.mollie.com/v2/payments`
- Supported methods: iDEAL, Bancontact, Card
- Currency: EUR

### PayNow
- Webhook endpoint: `/api/webhooks/paynow`
- Environment variables: `PAYNOW_API_KEY`, `PAYNOW_WEBHOOK_KEY`, `PAYNOW_ENVIRONMENT=live`, `PAYNOW_RETURN_URL=https://clouddroid.eu/checkout/success`
- **Storefront API checkout endpoint: `POST /v1/checkouts`** (not Management API)
- Store ID: `596937251510820864`
- Product ID: `596937594697154560`
- **Auth format: `Authorization: Customer <token>`** (Storefront API uses customer tokens)
- Customer auth endpoint: `POST /v1/store/customer/auth` (creates customer with platform 'paynow' and id = customerEmail)
- Webhook signature: HMAC SHA256 with timestamp tolerance 5 minutes
- Test customer ID: `596957825259806720`
- Webhook events verified: `ON_ORDER_COMPLETED`, `ONDELIVERYITEMADDED`, `ONDELIVERYITEMACTIVATED`

### Creem
- Webhook endpoint: `/api/webhooks/creem`
- Environment variables: `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_ENVIRONMENT=live`, `CREEM_RETURN_URL=https://clouddroid.eu/checkout/success`
- Checkout endpoint: `POST https://api.creem.io/v1/checkouts` (test: `https://test-api.creem.io/v1/checkouts`)
- Auth: `x-api-key` header
- Product IDs: developer `prod_RI7KMJ2qwawQVhP2NzGJf`, professional `prod_76ohlfCZSqbhwpuhRPIBW7`, team `prod_1P7uHkFDLk6RnuHUqcZmMf`
- Webhook signature: HMAC-SHA256 of raw payload, header `creem-signature`
- Subscribed events: `checkout.completed`, `subscription.active`, `subscription.paid`, `subscription.canceled`, `refund.created`, `dispute.created`
- Success redirect: `?checkout_id=...&order_id=...&customer_id=...&product_id=...`
- Merchant of Record (handles global tax compliance in 190+ countries)

## 📄 License

Proprietary - All rights reserved

## 🔄 Recent Updates (2026-08-30)

- **Dark mode** — Full dark mode support across all dashboard pages with `dark:` Tailwind variants
- **Empty states** — Consistent empty state designs for alerts, monitoring, compliance, users, announcements
- **Design unification** — All tables, cards, badges, and buttons use consistent styling
- **Bug fixes** — Fixed string interpolation bugs in `class` attributes (alerts, billing)
- **PayNow Storefront API** — Migrated from Management API to Storefront API for unique customer binding
- **Admin dashboard** — Added plan distribution, expiring soon list, revenue by month chart
- **Dashboard overview** — Added renewal countdown, instances preview, billing snapshot, activity feed
