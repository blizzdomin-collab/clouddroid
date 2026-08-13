# CloudDroid

Enterprise-grade cloud Android workspaces for QA automation, app testing, and secure remote productivity.

## 🚀 Tech Stack

- **Framework:** Astro 7.2 with Node.js adapter
- **Styling:** Tailwind CSS v4
- **Database:** SQLite via `better-sqlite3` (`.data/clouddroid.db`)
- **Cache/Realtime:** Redis (`ioredis`) + WebSocket server (`ws`)
- **Payments:** Dodo Payments integration
- **Deployment:** PM2 + Nginx + Let's Encrypt SSL
- **Auto-deploy:** GitHub Actions on push to `main`

## 📁 Project Structure

```
├── src/
│   ├── layouts/
│   │   ├── Layout.astro          # Root layout with Inter font, OG meta
│   │   └── DashboardLayout.astro # Authenticated dashboard shell
│   ├── pages/
│   │   ├── index.astro           # Marketing homepage
│   │   ├── login.astro           # Login page
│   │   ├── register.astro        # Registration page
│   │   ├── forgot-password.astro # Password reset request
│   │   ├── reset-password.astro  # Password reset form
│   │   ├── change-password.astro # Forced password change
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
│   │   ├── legal/                # Legal pages
│   │   │   ├── terms.astro
│   │   │   ├── privacy.astro
│   │   │   ├── aup.astro
│   │   │   └── refund.astro
│   │   ├── api/                  # API routes
│   │   │   ├── auth/             # Login, logout, register, password reset, 2FA, activity, sessions
│   │   │   ├── checkout.ts       # Dodo Payments checkout session
│   │   │   ├── webhooks/         # Dodo Payments webhooks
│   │   │   ├── instances/        # Instance CRUD + actions + detail
│   │   │   ├── monitoring/       # Metrics, collect, charts
│   │   │   ├── audit/            # Logs, export CSV
│   │   │   ├── alerts/           # Alerts + SSE stream
│   │   │   ├── billing/          # Subscription, invoices
  │   │   │   ├── admin/            # User management + admin stats
│   │   │   ├── notifications/    # Notification channels
│   │   │   └── health.ts         # Health check
│   │   └── api-docs.astro        # API documentation page
│   │   └── 404.astro, 500.astro  # Error pages
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Pricing.astro
│   │   └── ProductShowcase.astro
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
└── package.json
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

## 📄 License

Proprietary - All rights reserved
