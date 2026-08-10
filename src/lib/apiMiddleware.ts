import type { APIRoute } from 'astro';
import { generateRequestId, info, error as logError } from '../lib/logger';

export function withLogging(handler: APIRoute): APIRoute {
  return async (context) => {
    const requestId = generateRequestId();
    const { method, url } = context.request;

    info(requestId, `Incoming ${method} ${url.pathname}`);

    try {
      const response = await handler(context);
      info(requestId, `Completed ${method} ${url.pathname}`, { status: response.status });
      return response;
    } catch (err) {
      logError(requestId, `Unhandled error in ${method} ${url.pathname}`, {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
