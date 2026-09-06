import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  const token = crypto.randomUUID();
  cookies.set('csrf_token', token, {
    path: '/',
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60,
  });
  return new Response(JSON.stringify({ csrfToken: token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
