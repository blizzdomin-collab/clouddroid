# CloudDroid

Enterprise-grade cloud Android workspaces for QA automation, app testing, and secure remote productivity.

## 🚀 Tech Stack

- **Framework:** Astro 7.3 with Node.js adapter
- **Styling:** Tailwind CSS v4
- **Database:** SQLite via `better-sqlite3` (`.data/clouddroid.db`)
- **Cache/Realtime:** Redis (`ioredis`) + WebSocket server (`ws`)
- **Payments:** Dodo Payments + Mollie + PayNow + Creem + EasyTransac + Whop
- **Deployment:** PM2 + Nginx + Let's Encrypt SSL
- **Auto-deploy:** GitHub Actions on push to `main`

## 📁 Project Structure

```
├── src/
│   ├── layouts/
│   │   ├── Layout.astro              # Root layout with Inter font, OG meta, JSON-LD, GTM, cookie consent
│   │   └── DashboardLayout.astro     # Authenticated dashboard shell with sidebar nav
│   ├── pages/
│   │   ├── index.astro               # Marketing homepage
│   │   ├── about.astro               # About page
│   │   ├── pricing.astro             # Pricing page with annual toggle + comparison table
│   │   ├── faq.astro                 # Frequently asked questions (FAQPage JSON-LD)
│   │   ├── contact.astro             # Contact form + info
│   │   ├── status.astro              # System status / uptime
│   │   ├── business.astro            # KYB/business verification info
│   │   ├── security.astro            # Security overview
│   │   ├── security-disclosure.astro # Vulnerability disclosure
│   │   ├── sla.astro                 # Service Level Agreement
│   │   ├── dpa.astro                 # Data Processing Agreement
│   │   ├── changelog.astro           # Public changelog (announcements)
│   │   ├── how-it-works.astro        # Onboarding / how-it-works guide
│   │   ├── api-docs.astro            # API documentation
│   │   ├── login.astro               # Login page
│   │   ├── register.astro            # Registration page
│   │   ├── forgot-password.astro     # Password reset request
│   │   ├── reset-password.astro      # Password reset form
│   │   ├── change-password.astro     # Forced password change
│   │   ├── 404.astro, 500.astro      # Error pages
│   │   ├── robots.txt.ts             # robots.txt generator
│   │   ├── sitemap.xml.ts            # sitemap generator
│   │   ├── announcements.astro       # Public announcements page
│   │   ├── monitoring.astro          # Public monitoring page
│   │   ├── alerts.astro              # Public alerts page
│   │   ├── compliance.astro          # Public compliance page
│   │   ├── dashboard/                # Authenticated dashboard pages
│   │   │   ├── index.astro           # Overview with renewal countdown, instances preview, billing snapshot, activity feed
│   │   │   ├── instances.astro       # Instance management
│   │   │   ├── instances/[id].astro  # Instance detail with metrics
│   │   │   ├── monitoring.astro      # Metrics & charts
│   │   │   ├── compliance.astro      # Audit logs
│   │   │   ├── alerts.astro          # Real-time alerts
│   │   │   ├── billing.astro         # Subscription & invoices
│   │   │   ├── users.astro           # Admin user management
│   │   │   ├── users/[id].astro      # User detail
│   │   │   ├── admin.astro           # Admin dashboard with plan distribution, expiring soon, revenue chart
│   │   │   ├── activity.astro        # Login history
│   │   │   ├── settings.astro        # Profile, 2FA, notifications, dark mode
│   │   │   └── announcements.astro   # Dashboard announcements
│   │   ├── checkout/                 # Checkout flow
│   │   │   ├── [plan].astro          # Plan checkout page
│   │   │   ├── success.astro         # Payment success + credentials
│   │   │   └── cancel.astro          # Payment cancel
│   │   ├── legal/                    # Legal & compliance pages
│   │   │   ├── terms.astro
│   │   │   ├── privacy.astro
│   │   │   ├── aup.astro
│   │   │   ├── refund.astro
│   │   │   ├── subprocessors.astro
│   │   │   └── aml.astro
│   │   └── api/                      # API routes
│   │       ├── auth/                 # Login, logout, register, password reset, 2FA, activity, sessions
│   │       │   ├── login.ts
│   │       │   ├── logout.ts
│   │       │   ├── register.ts
│   │       │   ├── me.ts
│   │       │   ├── forgot-password.ts
│   │       │   ├── reset-password.ts
│   │       │   ├── change-password.ts
│   │       │   ├── sessions.ts
│   │       │   ├── activity.ts
│   │       │   └── 2fa/
│   │       │       ├── setup.ts
│   │       │       ├── enable.ts
│   │       │       └── disable.ts
│   │       ├── checkout.ts           # Dodo Payments + Mollie + PayNow + Creem + EasyTransac checkout session
│   │       ├── customer-portal.ts    # Customer portal session
│   │       ├── contact.ts            # Contact form submission
│   │       ├── announcements.ts      # Public announcements feed
│   │       ├── analytics.ts          # Analytics data
│   │       ├── csrf.ts               # CSRF token endpoint
│   │       ├── health.ts             # Health check
│   │       ├── instances.ts          # Instance CRUD (list/create)
│   │       ├── webhooks/             # Payment webhooks
│   │       │   ├── dodopayments.ts
│   │       │   ├── mollie.ts
│   │       │   ├── paynow.ts
│   │       │   ├── easytransac.ts
│   │       │   ├── creem.ts
│   │       │   └── whop.ts
│   │       ├── instances/            # Instance actions
│   │       │   ├── [id].ts           # Instance detail/update/delete
│   │       │   ├── [id]/stop.ts
│   │       │   ├── [id]/start.ts
│   │       │   └── [id]/restart.ts
│   │       ├── monitoring/           # Metrics & monitoring
│   │       │   ├── metrics.ts
│   │       │   ├── instances.ts
│   │       │   └── collect.ts
│   │       ├── audit/                # Audit logs
│   │       │   ├── logs.ts
│   │       │   └── export.ts
│   │       ├── alerts/               # Alerts
│   │       │   └── stream.ts         # SSE alert stream
│   │       ├── billing/              # Subscription & invoices
│   │       │   ├── subscription.ts
│   │       │   ├── invoices.ts
│   │       │   └── cancel.ts
│   │       ├── admin/                # Admin routes
│   │       │   ├── users.ts
│   │       │   ├── users/[id].ts
│   │       │   ├── health.ts
│   │       │   ├── announcements.ts
│   │       │   ├── announcements/[id].ts
│   │       │   ├── stats.ts
│   │       │   ├── invoices.ts
│   │       │   └── subscriptions.ts
│   │       └── notifications/        # Notification channels
│   │           └── channels.ts
│   ├── components/
│   │   ├── Header.astro              # Site header with navigation
│   │   ├── Footer.astro              # Site footer
│   │   ├── Hero.astro                # Hero section
│   │   ├── TrustStrip.astro          # Trust badges/strip
│   │   ├── Features.astro            # Features section
│   │   ├── UseCases.astro            # Use cases section
│   │   ├── ProductShowcase.astro     # Product showcase
│   │   ├── Pricing.astro             # Pricing section
│   │   ├── Announcements.astro       # User-facing announcement banner
│   │   ├── Breadcrumbs.astro         # SEO breadcrumb navigation
│   │   ├── Skeleton.astro            # Loading skeleton
│   │   └── Toast.astro               # Toast notification component
│   ├── lib/
│   │   ├── database.ts               # SQLite DB re-export
│   │   ├── database-sqlite.ts        # SQLite implementation with schema, migrations, seeding, CRUD
│   │   ├── redis.ts                  # Redis client + cache helpers
│   │   ├── validation.ts             # Zod schemas
│   │   ├── logger.ts                 # Structured JSON logging
│   │   ├── apiMiddleware.ts          # Request logging wrapper
│   │   ├── twofactor.ts              # TOTP 2FA support
│   │   ├── rateLimit.ts              # In-memory rate limiter with Redis backing
│   │   ├── requestLimits.ts          # Request size limits
│   │   ├── api.ts                    # CORS + JSON helpers
│   │   ├── stripe.ts                 # Stripe client for consulting subdomain
│   │   └── websocket.ts              # WebSocket server utilities
│   └── styles/
│       └── global.css                # Tailwind v4 theme with dark mode
├── server/
│   └── websocket.mjs                 # Production WebSocket server for real-time updates
├── deploy/
│   ├── ecosystem.config.cjs          # PM2 production config (app + WebSocket server)
│   ├── nginx.conf                    # Nginx reverse proxy template
│   └── scripts/
│       └── deploy.sh                 # VPS deployment script
├── .github/workflows/
│   └── deploy.yml                    # GitHub Actions auto-deploy
├── .env.example                      # Environment variables template
├── astro.config.mjs                  # Astro + Tailwind + Node adapter
├── package.json
├── clouddroid-master-blueprint.md    # Compliance/KYB master blueprint
├── check-db.cjs                      # Database check utility
├── check-db.js                       # Database check utility
├── generate-pdfs.mjs                 # PDF generation utility
├── dodopayments_docs.txt             # Dodo Payments documentation reference
├── CLAUDE.md                         # Claude AI instructions
├── DEPLOY.md                         # Deployment documentation
├── clouddroid.json                   # Project metadata/config
├── EULA.pdf                          # End User License Agreement
├── Privacy_Policy.pdf                # Privacy Policy
├── Return_Policy.pdf                 # Return Policy
├── Terms_of_Service.pdf              # Terms of Service
├── tailwind.consulting.config.cjs    # Tailwind config for consulting subdomain
└── consulting/                       # Static consulting site for consulting.clouddroid.eu
    ├── index.html                    # Landing page
    ├── contact.html                  # Contact page with mailto form
    ├── terms.html                    # Terms & Conditions
    ├── privacy.html                  # Privacy Policy
    ├── refund.html                   # Refund & Cancellation Policy
    ├── css/
    │   └── styles.css
    └── js/
        └── main.js
```

## 🧞 Commands

| Command | Action |
|---------|--------|
| `npm install` | Install dependencies |
| `astro dev --background` | Start dev server in background |
| `astro dev stop` | Stop background dev server |
| `astro dev status` | Check dev server status |
| `astro dev logs` | View dev server logs |
| `npm run build` | Build production site to `./dist/` |
| `npm run preview` | Preview build locally |
| `npm run build:all` | Build main app + consulting CSS |

## 🔐 Environment Variables

```env
# Dodo Payments
DODO_PAYMENTS_API_KEY=your_api_key_here
DODO_PAYMENTS_WEBHOOK_KEY=your_webhook_secret_here
DODO_PAYMENTS_ENVIRONMENT=live_mode
DODO_PAYMENTS_RETURN_URL=https://clouddroid.eu/checkout/success
DODO_PAYMENTS_WEBHOOK_URL=https://clouddroid.eu/api/webhooks/dodopayments

# Mollie
MOLLIE_API_KEY=your_api_key_here
MOLLIE_WEBHOOK_KEY=your_webhook_secret_here
MOLLIE_ENVIRONMENT=live
MOLLIE_RETURN_URL=https://clouddroid.eu/checkout/success
MOLLIE_WEBHOOK_URL=https://clouddroid.eu/api/webhooks/mollie

# PayNow
PAYNOW_API_KEY=your_api_key_here
PAYNOW_WEBHOOK_KEY=your_webhook_secret_here
PAYNOW_ENVIRONMENT=live
PAYNOW_RETURN_URL=https://clouddroid.eu/checkout/success
PAYNOW_WEBHOOK_URL=https://clouddroid.eu/api/webhooks/paynow

# EasyTransac
EASYTRANSAC_API_KEY=your_api_key_here
EASYTRANSAC_WEBHOOK_KEY=your_webhook_secret_here
EASYTRANSAC_ENVIRONMENT=live
EASYTRANSAC_RETURN_URL=https://clouddroid.eu/checkout/success
EASYTRANSAC_CANCEL_URL=https://clouddroid.eu/pricing
EASYTRANSAC_WEBHOOK_URL=https://clouddroid.eu/api/webhooks/easytransac

# Creem (Merchant of Record)
CREEM_API_KEY=creem_your_api_key_here
CREEM_WEBHOOK_SECRET=whsec_your_webhook_secret_here
CREEM_ENVIRONMENT=live
CREEM_RETURN_URL=https://clouddroid.eu/checkout/success
CREEM_WEBHOOK_URL=https://clouddroid.eu/api/webhooks/creem

# Whop
WHOP_API_KEY=whop_your_api_key_here
WHOP_WEBHOOK_SECRET=ws_your_webhook_secret_here
WHOP_WEBHOOK_URL=https://clouddroid.eu/api/webhooks/whop

# Stripe (Consulting subdomain)
STRIPE_SECRET_KEY=sk_test_or_live_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
STRIPE_PRODUCT_STARTER=prod_replace_me
STRIPE_PRODUCT_PROFESSIONAL=prod_replace_me
STRIPE_PRODUCT_ENTERPRISE=prod_replace_me
STRIPE_PRODUCT_TRIAL=prod_replace_me
CONSULTING_SUCCESS_URL=https://consulting.clouddroid.eu/success.html
CONSULTING_CANCEL_URL=https://consulting.clouddroid.eu/cancel.html

# Infrastructure
REDIS_URL=redis://localhost:6379
WS_PORT=4322
```

## 🚢 Deployment

Production runs on VPS with:
- Node.js 26 LTS
- PM2 process manager (1 process: Astro standalone server)
- Nginx reverse proxy with WebSocket proxy
- Redis for caching and pub/sub
- Let's Encrypt SSL (`clouddroid.eu`)

Auto-deploy via GitHub Actions on push to `main`.

### VPS Setup (Ubuntu)

```bash
# 1. Create deploy user
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy

# 2. Install dependencies
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_26.x | sudo -E bash -
apt install -y nodejs nginx certbot python3-certbot-nginx redis-server
npm install -g pm2
systemctl enable redis-server && systemctl start redis-server

# 3. Clone project
su - deploy
git clone https://github.com/blizzdomin-collab/clouddroid.git /var/www/clouddroid
cd /var/www/clouddroid
sudo chown -R $USER:$USER /var/www/clouddroid

# 4. Configure .env
nano .env

# 5. Build and start
npm install --production=false
npm run build
pm2 start dotenv --name "clouddroid" -- -e /var/www/clouddroid/.env node dist/server/entry.mjs
pm2 save
pm2 startup
```

### Nginx Config

```nginx
server {
    listen 80;
    server_name clouddroid.eu www.clouddroid.eu;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name clouddroid.eu www.clouddroid.eu;

    ssl_certificate /etc/letsencrypt/live/clouddroid.eu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clouddroid.eu/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_astro/ {
        alias /var/www/clouddroid/dist/client/_astro/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        alias /var/www/clouddroid/dist/client/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### SSL Certificate

```bash
sudo systemctl stop nginx
sudo certbot certonly --standalone -d clouddroid.eu -d www.clouddroid.eu
sudo systemctl start nginx
```

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
- Environment variables: `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_WEBHOOK_KEY`, `DODO_PAYMENTS_ENVIRONMENT=live_mode`, `DODO_PAYMENTS_RETURN_URL`, `DODO_PAYMENTS_WEBHOOK_URL`
- Checkout endpoint: `POST /checkouts` with `product_cart`
- Customer portal endpoint: `POST /customers/{customer_id}/customer-portal/session`
- Subscribed events: checkout.session.completed, subscription.active, subscription.cancelled, subscription.renewed, payment.succeeded, payment.failed, refund.succeeded
- Account status: Fully approved, live mode activated
- **Webhook signature algorithm (IMPORTANT):** Dodo does NOT use the standard Svix format. The signed content is `webhook-id + "." + webhook-timestamp + "." + raw-payload-body`, HMAC-SHA256 with the base64-decoded secret (strip the `whsec_` prefix first). Signature header is `webhook-signature` with format `v1,<base64>`. Verify with `crypto.timingSafeEqual`.
- **Checkout:** All available payment methods are enabled (cards, Apple Pay, Google Pay, etc.). Dodo Payments displays all active methods from the dashboard.

### Mollie
- Webhook endpoint: `/api/webhooks/mollie`
- Environment variables: `MOLLIE_API_KEY`, `MOLLIE_WEBHOOK_KEY`, `MOLLIE_ENVIRONMENT=live`, `MOLLIE_RETURN_URL`, `MOLLIE_WEBHOOK_URL`
- Payments endpoint: `POST https://api.mollie.com/v2/payments`
- Supported methods: iDEAL, Bancontact, Card
- Currency: EUR

### PayNow
- Webhook endpoint: `/api/webhooks/paynow`
- Environment variables: `PAYNOW_API_KEY`, `PAYNOW_WEBHOOK_KEY`, `PAYNOW_ENVIRONMENT=live`, `PAYNOW_RETURN_URL`, `PAYNOW_WEBHOOK_URL`
- **Storefront API checkout endpoint: `POST /v1/checkouts`** (not Management API)
- Store ID: `596937251510820864`
- Product ID: `596937594697154560`
- **Auth format: `Authorization: Customer <token>`** (Storefront API uses customer tokens)
- Customer auth endpoint: `POST /v1/store/customer/auth` (creates customer with platform 'paynow' and id = customerEmail)
- Webhook signature: HMAC SHA256 with timestamp tolerance 5 minutes
- Test customer ID: `596957825259806720`
- Webhook events verified: `ON_ORDER_COMPLETED`, `ONDELIVERYITEMADDED`, `ONDELIVERYITEMACTIVATED`

### EasyTransac
- Webhook endpoint: `/api/webhooks/easytransac`
- Environment variables: `EASYTRANSAC_API_KEY`, `EASYTRANSAC_WEBHOOK_KEY`, `EASYTRANSAC_ENVIRONMENT=live`, `EASYTRANSAC_RETURN_URL`, `EASYTRANSAC_CANCEL_URL`, `EASYTRANSAC_WEBHOOK_URL`
- Cancel URL: `EASYTRANSAC_CANCEL_URL=https://clouddroid.eu/pricing`

### Creem
- Webhook endpoint: `/api/webhooks/creem`
- Environment variables: `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_ENVIRONMENT=live`, `CREEM_RETURN_URL`, `CREEM_WEBHOOK_URL`
- Checkout endpoint: `POST https://api.creem.io/v1/checkouts` (test: `https://test-api.creem.io/v1/checkouts`)
- Auth: `x-api-key` header
- Product IDs: developer `prod_RI7KMJ2qwawQVhP2NzGJf`, professional `prod_76ohlfCZSqbhwpuhRPIBW7`, team `prod_1P7uHkFDLk6RnuHUqcZmMf`
- Webhook signature: HMAC-SHA256 of raw payload, header `creem-signature`
- Subscribed events: `checkout.completed`, `subscription.active`, `subscription.paid`, `subscription.canceled`, `refund.created`, `dispute.created`
- Success redirect: `?checkout_id=...&order_id=...&customer_id=...&product_id=...`
- Merchant of Record (handles global tax compliance in 190+ countries)

### Whop
- Webhook endpoint: `/api/webhooks/whop`
- Environment variables: `WHOP_API_KEY`, `WHOP_WEBHOOK_SECRET`, `WHOP_WEBHOOK_URL`
- Events to subscribe: payment.succeeded, payment.failed, payment.pending, membership.activated, membership.deactivated, membership.cancel_at_period_end_changed, membership.trial_ending_soon, refund.created, refund.updated, plan.created, plan.updated, plan.deleted, product.created, product.updated, product.deleted, product.published, product.unpublished

## 📄 License

Proprietary - All rights reserved

## 🔄 Recent Updates (2026-09-08)

- **New VPS deployment** — Fresh Ubuntu VPS setup with Node.js 26 LTS, PM2, Nginx, Redis, and Let's Encrypt SSL
- **Rebranding banner** — Added dismissable announcement banner for CloudDroid → Liberty Assurance transition
- **Pricing update** — Updated to new pricing: Developer $1,499, Professional $1,999, Team $2,499
- **Annual pricing removed** — Removed annual pricing toggle and logic from pricing page
- **IPv4/IPv6 fix** — Fixed nginx proxy_pass to use `127.0.0.1:4321` instead of `[::1]:4321`
- **PM2 startup fix** — Fixed PM2 startup with `dotenv-cli` for proper `.env` loading
- **Checkout fix** — Fixed `Internal server error` on checkout caused by missing `expires_at` / `completed_at` columns in `checkout_sessions` table. Added auto-migration in `src/lib/database-sqlite.ts` so existing SQLite databases upgrade safely on startup.
- **Checkout logging** — Added structured `[checkout]` and `[database]` logs to `src/pages/api/checkout.ts`, `src/lib/rateLimit.ts`, `src/lib/redis.ts`, and `src/lib/database-sqlite.ts` for faster production diagnosis.
- **Dark mode** — Full dark mode support across all dashboard pages with `dark:` Tailwind variants
- **Empty states** — Consistent empty state designs for alerts, monitoring, compliance, users, announcements
- **Design unification** — All tables, cards, badges, and buttons use consistent styling
- **Bug fixes** — Fixed string interpolation bugs in `class` attributes (alerts, billing)
- **PayNow Storefront API** — Migrated from Management API to Storefront API for unique customer binding
- **Admin dashboard** — Added plan distribution, expiring soon list, revenue by month chart
- **Dashboard overview** — Added renewal countdown, instances preview, billing snapshot, activity feed
- **Whop integration** — Added Whop payment gateway with webhook support
- **EasyTransac integration** — Added EasyTransac payment gateway with webhook support
- **Additional API routes** — Added customer portal, analytics, CSRF token, admin announcements/invoices/subscriptions, user detail, instance actions, monitoring instances, audit export, billing cancel, alerts SSE stream, notification channels
- **Additional pages** — Added public announcements, monitoring, alerts, compliance pages; dashboard announcements page
- **Additional components** — Added Skeleton and Toast components
- **Additional lib modules** — Added stripe.ts and websocket.ts utility modules
- **Root utilities** — Added check-db.cjs, check-db.js, generate-pdfs.mjs, dodopayments_docs.txt
- **PDF assets** — Added EULA.pdf, Privacy_Policy.pdf, Return_Policy.pdf, Terms_of_Service.pdf
- **Config files** — Added CLAUDE.md, DEPLOY.md, clouddroid.json, tailwind.consulting.config.cjs
