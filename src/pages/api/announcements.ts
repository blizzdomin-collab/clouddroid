import type { APIRoute } from 'astro';
import { getAnnouncements } from '../../lib/database';

export const GET: APIRoute = async () => {
  try {
    const announcements = getAnnouncements().filter((a) => a.status === 'active');
    return new Response(JSON.stringify({ announcements }), {
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
