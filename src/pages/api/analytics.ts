import type { APIRoute } from 'astro';

const MAX_BODY = 4096;
const ALLOWED_EVENTS = new Set(['pageview', 'cta_click', 'checkout_started', 'checkout_completed', 'form_submit']);

// In-memory ring buffer; for production replace with Redis or SQLite.
const EVENTS: Array<{
  ts: string;
  event: string;
  path: string | null;
  referrer: string | null;
  ua: string | null;
  country: string | null;
}> = [];
const MAX_EVENTS = 5000;

function trim(v: unknown, max = 256): string | null {
  if (typeof v !== 'string') return null;
  return v.length > max ? v.slice(0, max) : v;
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) {
      return new Response('Payload too large', { status: 413 });
    }
    body = JSON.parse(text);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const event = trim(body.event, 64);
  if (!event || !ALLOWED_EVENTS.has(event)) {
    return new Response('Unknown event', { status: 400 });
  }

  // Hash the IP for privacy — we never store raw IPs.
  const ip = clientAddress || 'unknown';
  const ipHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip + '|cd-analytics-salt'))
    .then((buf) => Array.from(new Uint8Array(buf)).slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join(''));

  const entry = {
    ts: new Date().toISOString(),
    event,
    path: trim(body.path, 512),
    referrer: trim(body.referrer, 512),
    ua: trim(request.headers.get('user-agent'), 256),
    country: trim(request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country'), 8) || null,
  };

  EVENTS.push(entry);
  if (EVENTS.length > MAX_EVENTS) EVENTS.shift();

  // Server-side console log so you can tail logs to see activity
  console.log(`[analytics] ${ipHash.slice(0, 8)} ${event} ${entry.path || ''}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

export const GET: APIRoute = async () => {
  // Simple summary endpoint — no auth, exposes only aggregate counts.
  const counts: Record<string, number> = {};
  for (const e of EVENTS) counts[e.event] = (counts[e.event] || 0) + 1;
  return new Response(
    JSON.stringify({ total: EVENTS.length, by_event: counts, since: EVENTS[0]?.ts || null }),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
};
