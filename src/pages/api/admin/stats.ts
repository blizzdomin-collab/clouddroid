import type { APIRoute } from 'astro';
import { getUsers, getInstances, getSubscriptions, getInvoices } from '../../../lib/database';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const sessionCookie = cookies.get('session');
    if (!sessionCookie) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const session = JSON.parse(sessionCookie.value);
    if (!session.authenticated || !session.email || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const users = getUsers();
    const instances = getInstances();
    const subscriptions = getSubscriptions();
    const invoices = getInvoices();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const activeSubscriptions = subscriptions.filter((s) => s.status === 'active');
    const totalRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0);

    const userGrowth = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const count = users.filter((u) => new Date(u.created_at) <= date).length;
      return { date: date.toISOString().split('T')[0], count };
    });

    const revenueByDay = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
      const dayInvoices = invoices.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return invDate.toDateString() === date.toDateString() && inv.status === 'paid';
      });
      return { date: date.toISOString().split('T')[0], amount: dayInvoices.reduce((sum, inv) => sum + inv.amount, 0) };
    });

    const instanceStatusCounts = {
      running: instances.filter((i) => i.status === 'running').length,
      stopped: instances.filter((i) => i.status === 'stopped').length,
      warning: instances.filter((i) => i.status === 'warning').length,
    };

    const recentUsers = users
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const recentInvoices = invoices
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const dodoUsers = users.filter((u) => u.dodo_customer_id).length;
    const mollieUsers = users.filter((u) => u.mollie_customer_id).length;

    const dodoRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .filter((inv) => {
        const sub = subscriptions.find((s) => s.id === inv.subscription_id);
        if (!sub) return false;
        const user = users.find((u) => u.id === sub.user_id);
        return user?.dodo_customer_id;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    const mollieRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .filter((inv) => {
        const sub = subscriptions.find((s) => s.id === inv.subscription_id);
        if (!sub) return false;
        const user = users.find((u) => u.id === sub.user_id);
        return user?.mollie_customer_id;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    return new Response(
      JSON.stringify({
        overview: {
          totalUsers: users.length,
          totalInstances: instances.length,
          activeSubscriptions: activeSubscriptions.length,
          totalRevenue,
          pendingInvoices: invoices.filter((inv) => inv.status === 'pending').length,
        },
        paymentGateways: {
          dodo: { users: dodoUsers, revenue: dodoRevenue },
          mollie: { users: mollieUsers, revenue: mollieRevenue },
        },
        userGrowth,
        revenueByDay,
        instanceStatusCounts,
        recentUsers,
        recentInvoices,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
