//
// Copyright 2026 DXOS.org
//

// The diagram app's Cloudflare Worker. `wrangler.jsonc` routes only `/api/*` here; every other path is a static asset
// with the SPA fallback.

export type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  POSTHOG_OTLP_URL?: string;
  POSTHOG_PROJECT_TOKEN?: string;
};

export const OTEL_PREFIX = '/api/otel';
const OTEL_SIGNALS = new Set(['/v1/traces', '/v1/logs', '/v1/metrics']);
const OTEL_MAX_BODY_SIZE = 64 * 1024 * 1024;

/** Same-origin only: the app posts to its own Worker, and a POST always carries `Origin`. */
const isSameOrigin = (request: Request) => request.headers.get('Origin') === new URL(request.url).origin;

const corsHeaders = (request: Request): Record<string, string> => ({
  'Access-Control-Allow-Origin': isSameOrigin(request) ? new URL(request.url).origin : '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding',
  'Vary': 'Origin',
});

/** Forwards OTLP to PostHog with the project token, which stays on the server. */
const handleOtel = async (request: Request, env: Env, signal: string): Promise<Response> => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }
  if (!isSameOrigin(request)) {
    return new Response('Forbidden', { status: 403, headers: cors });
  }
  if (!env.POSTHOG_OTLP_URL || !env.POSTHOG_PROJECT_TOKEN) {
    return new Response('OTel proxy not configured', { status: 503, headers: cors });
  }
  if (!request.body) {
    return new Response('Empty body', { status: 400, headers: cors });
  }

  // Counted as it streams, since `Content-Length` can be missing or false.
  let size = 0;
  let tooLarge = false;
  const body = request.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        size += chunk.byteLength;
        if (size > OTEL_MAX_BODY_SIZE) {
          tooLarge = true;
          controller.error(new Error('Payload too large'));
        } else {
          controller.enqueue(chunk);
        }
      },
    }),
  );

  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    'Authorization': `Bearer ${env.POSTHOG_PROJECT_TOKEN}`,
  };
  const encoding = request.headers.get('Content-Encoding');
  if (encoding) {
    headers['Content-Encoding'] = encoding;
  }

  let upstream: Response | undefined;
  try {
    upstream = await fetch(`${env.POSTHOG_OTLP_URL.replace(/\/$/, '')}${signal}`, {
      method: 'POST',
      headers,
      body,
      // Required by the Fetch spec for a streamed body; Workers ignore it.
      duplex: 'half',
    } as RequestInit);
  } catch {
    // An aborted body stream rejects the fetch.
  }
  if (tooLarge) {
    return new Response('Payload too large', { status: 413, headers: cors });
  }
  if (!upstream) {
    return new Response('Bad gateway', { status: 502, headers: cors });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json', ...cors },
  });
};

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith(`${OTEL_PREFIX}/`)) {
      const signal = pathname.slice(OTEL_PREFIX.length);
      if (OTEL_SIGNALS.has(signal)) {
        return handleOtel(request, env, signal);
      }
    }
    return env.ASSETS.fetch(request);
  },
};
