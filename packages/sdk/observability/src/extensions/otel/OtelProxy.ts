//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// Cloudflare Workers import this through its own subpath, so it uses only the Fetch API.

/** The route a client's OTel exporter posts to on the deployment that serves it. */
export const PREFIX = '/api/otel';

const SIGNALS = new Set(['/v1/traces', '/v1/logs', '/v1/metrics']);

export type Options = {
  /** PostHog's OTLP base URL, e.g. `https://eu.i.posthog.com/i`. */
  url?: string;
  /** The project token, sent upstream as the bearer token so it never reaches the client. */
  token?: string;
  /** Origins admitted besides the deployment's own, such as a native build's. */
  extraOrigins?: ReadonlySet<string>;
  /** Largest body forwarded, in bytes. */
  maxBodySize: number;
};

/** A POST always carries `Origin`, so a missing one is refused. */
const isAllowedOrigin = (request: Request, origin: string | null, extraOrigins?: ReadonlySet<string>): boolean =>
  origin !== null && (origin === new URL(request.url).origin || extraOrigins?.has(origin) === true);

const corsHeaders = (
  request: Request,
  origin: string | null,
  extraOrigins?: ReadonlySet<string>,
): Record<string, string> => ({
  'Access-Control-Allow-Origin': isAllowedOrigin(request, origin, extraOrigins) ? (origin ?? '') : '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding',
  'Vary': 'Origin',
});

/**
 * Forwards an OTLP request on `/api/otel/v1/{traces,logs,metrics}` to PostHog with the project token.
 * Returns `undefined` for any other path, so the caller can route it elsewhere.
 */
export const handle = (request: Request, options: Options): Promise<Response> | undefined => {
  const { pathname } = new URL(request.url);
  const signal = pathname.startsWith(`${PREFIX}/`) ? pathname.slice(PREFIX.length) : undefined;
  return signal && SIGNALS.has(signal) ? forward(request, options, signal) : undefined;
};

const forward = async (
  request: Request,
  { url, token, extraOrigins, maxBodySize }: Options,
  signal: string,
): Promise<Response> => {
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(request, origin, extraOrigins);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }
  if (!isAllowedOrigin(request, origin, extraOrigins)) {
    return new Response('Forbidden', { status: 403, headers: cors });
  }
  if (!url || !token) {
    return new Response('OTel proxy not configured', { status: 503, headers: cors });
  }
  if (!request.body) {
    return new Response('Empty body', { status: 400, headers: cors });
  }

  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  for (const name of ['Content-Encoding', 'Content-Length']) {
    const value = request.headers.get(name);
    if (value) {
      headers[name] = value;
    }
  }

  // Counted as it streams, since `Content-Length` can be missing or false.
  let size = 0;
  let tooLarge = false;
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform: (chunk, controller) => {
      size += chunk.byteLength;
      if (size > maxBodySize) {
        tooLarge = true;
        controller.error(new Error('Payload too large'));
      } else {
        controller.enqueue(chunk);
      }
    },
  });
  const piped = request.body.pipeTo(writable).catch(() => {});

  let upstream: Response | undefined;
  try {
    upstream = await fetch(`${url.replace(/\/$/, '')}${signal}`, { method: 'POST', headers, body: readable });
  } catch {
    // An aborted body stream rejects the fetch, as does an unreachable upstream. A fetch that failed before reading
    // leaves the pipe blocked on backpressure, so the body is cancelled to end it.
    await readable.cancel().catch(() => {});
  }
  await piped;

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
