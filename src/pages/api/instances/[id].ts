import type { APIRoute } from 'astro';
import { getInstanceById, updateInstance, deleteInstance, getMetricsHistory, getAuditLogs } from '../../../lib/database';

export const GET: APIRoute = async ({ params, url }) => {
  const instanceId = params?.id;
  if (!instanceId) {
    return new Response(JSON.stringify({ error: 'Instance ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const instance = getInstanceById(instanceId);
  if (!instance) {
    return new Response(JSON.stringify({ error: 'Instance not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const metricsLimit = Math.min(Math.max(Number(url.searchParams.get('metrics_limit') || 20), 1), 100);
  const metrics = getMetricsHistory(instanceId).slice(-metricsLimit);

  const logs = getAuditLogs().filter((l) => l.instance_id === instanceId).slice(-10);

  return new Response(
    JSON.stringify({
      instance,
      metrics,
      logs,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const instanceId = params?.id;
  if (!instanceId) {
    return new Response(JSON.stringify({ error: 'Instance ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const instance = getInstanceById(instanceId);
  if (!instance) {
    return new Response(JSON.stringify({ error: 'Instance not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { tags, notes } = body;

    const updated = updateInstance(instanceId, {
      tags: Array.isArray(tags) ? tags : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
    });

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Failed to update instance' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, instance: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ params }) => {
  const instanceId = params?.id;
  if (!instanceId) {
    return new Response(JSON.stringify({ error: 'Instance ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const instance = getInstanceById(instanceId);
  if (!instance) {
    return new Response(JSON.stringify({ error: 'Instance not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const deleted = deleteInstance(instanceId);
  if (!deleted) {
    return new Response(JSON.stringify({ error: 'Failed to delete instance' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
