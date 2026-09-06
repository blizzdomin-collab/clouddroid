import type { APIRoute } from 'astro';
import { getInvoices, getInvoiceById, updateInvoice, getUsers } from '../../../lib/database';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search')?.toLowerCase() || '';

    let invoices = getInvoices();
    const users = getUsers();
    const userMap = new Map(users.map((u) => [u.id, u]));

    if (status) {
      invoices = invoices.filter((inv) => inv.status === status);
    }

    const data = invoices
      .map((inv) => {
        const user = userMap.get(inv.user_id);
        return {
          ...inv,
          user: user ? { id: user.id, email: user.email, name: user.name } : null,
        };
      })
      .filter((inv) => {
        if (!search) return true;
        return (
          inv.id.toLowerCase().includes(search) ||
          inv.user?.email?.toLowerCase().includes(search) ||
          inv.user?.name?.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ invoices: data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const { invoice_id, action } = body;

    if (!invoice_id || !action) {
      return new Response(JSON.stringify({ error: 'invoice_id and action are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === 'mark-paid') {
      const updated = updateInvoice(invoice_id, { status: 'paid', paid_at: new Date().toISOString() });
      if (!updated) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, invoice: updated }));
    }

    if (action === 'mark-pending') {
      const updated = updateInvoice(invoice_id, { status: 'pending', paid_at: null });
      if (!updated) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, invoice: updated }));
    }

    if (action === 'mark-failed') {
      const updated = updateInvoice(invoice_id, { status: 'failed' });
      if (!updated) return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, invoice: updated }));
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
