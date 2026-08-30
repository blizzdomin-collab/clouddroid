import type { APIRoute } from 'astro';
import { getUsers, getInstances, getSubscriptions, getInvoices, getUserByEmail, isSubscriptionActive } from '../../../lib/database';

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
    if (!session.authenticated || !session.email) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const adminUser = getUserByEmail(session.email);
    if (!adminUser || adminUser.role !== 'admin') {
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

    const activeSubscriptions = subscriptions.filter((s) => isSubscriptionActive(s));
    const expiringSoon = subscriptions.filter(
      (s) => s.status === 'active' && new Date(s.current_period_end).getTime() > Date.now() && new Date(s.current_period_end).getTime() <= Date.now() + 7 * 24 * 60 * 60 * 1000
    );
    const expiredSubscriptions = subscriptions.filter((s) => !isSubscriptionActive(s));

    const expiringSoonList = expiringSoon.map((s) => {
      const u = users.find((x) => x.id === s.user_id);
      const days = Math.ceil((new Date(s.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 1000));
      return {
        email: u?.email || 'unknown',
        plan: s.plan || 'Unknown',
        daysLeft: Math.max(0, days),
        current_period_end: s.current_period_end,
      };
    });

    const monthRevenueMap = new Map<string, number>();
    invoices
      .filter((inv) => inv.status === 'paid')
      .forEach((inv) => {
        const month = new Date(inv.created_at).toISOString().slice(0, 7);
        monthRevenueMap.set(month, (monthRevenueMap.get(month) || 0) + inv.amount);
      });
    const revenueByMonth = Array.from(monthRevenueMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, total]) => ({ month, total }));

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

    const planDistribution = subscriptions.reduce((acc: Record<string, number>, s) => {
      const plan = s.plan || 'Unknown';
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});

    const recentInvoices = invoices
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    const dodoUsers = users.filter((u) => u.dodo_customer_id).length;
    const mollieUsers = users.filter((u) => u.mollie_customer_id).length;
    const paynowUsers = users.filter((u) => u.paynow_customer_id).length;
    const easytransacUsers = users.filter((u) => u.easytransac_client_id).length;

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

    const paynowRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .filter((inv) => {
        const sub = subscriptions.find((s) => s.id === inv.subscription_id);
        if (!sub) return false;
        const user = users.find((u) => u.id === sub.user_id);
        return user?.paynow_customer_id;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    const easytransacRevenue = invoices
      .filter((inv) => inv.status === 'paid')
      .filter((inv) => {
        const sub = subscriptions.find((s) => s.id === inv.subscription_id);
        if (!sub) return false;
        const user = users.find((u) => u.id === sub.user_id);
        return user?.easytransac_client_id;
      })
      .reduce((sum, inv) => sum + inv.amount, 0);

    return new Response(
      JSON.stringify({
        overview: {
          totalUsers: users.length,
          totalInstances: instances.length,
          activeSubscriptions: activeSubscriptions.length,
          expiringSoon: expiringSoon.length,
          expiredSubscriptions: expiredSubscriptions.length,
          totalRevenue,
          pendingInvoices: invoices.filter((inv) => inv.status === 'pending').length,
        },
        planDistribution,
        paymentGateways: {
          dodo: { users: dodoUsers, revenue: dodoRevenue, currency: 'USD' },
          mollie: { users: mollieUsers, revenue: mollieRevenue, currency: 'EUR' },
          paynow: { users: paynowUsers, revenue: paynowRevenue, currency: 'USD' },
          easytransac: { users: easytransacUsers, revenue: easytransacRevenue, currency: 'EUR' },
        },
        userGrowth,
        revenueByDay,
        instanceStatusCounts,
        recentUsers,
        recentInvoices,
        expiringSoonList,
        revenueByMonth,
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
