//
// Copyright 2024 DXOS.org
//

type Env = {
  ASSETS: Fetcher;
  ENVIRONMENT?: string;
  FEEDBACK_LOGS?: R2Bucket;
  SIGNOZ_INGEST_URL?: string;
  SIGNOZ_INGESTION_KEY?: string;
};

const MAX_BODY_SIZE = 8 * 1024 * 1024; // 8MB.

const ALLOWED_ORIGINS = new Set([
  'https://composer.space',
  'https://staging.composer.space',
  'https://labs.composer.space',
  'https://main.composer.space',
]);

const corsHeaders = (origin: string | null): Record<string, string> => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : '',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Content-Encoding',
  Vary: 'Origin',
});

/** Handle /api/feedback-logs — upload NDJSON debug logs to R2. */
const handleFeedbackLogs = async (request: Request, env: Env): Promise<Response> => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!env.FEEDBACK_LOGS) {
    return new Response('Feedback logs storage not configured', { status: 503 });
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_SIZE) {
    return new Response('Payload too large', { status: 413 });
  }

  const body = await request.text();
  if (body.length === 0) {
    return new Response('Empty body', { status: 400 });
  }

  if (body.length > MAX_BODY_SIZE) {
    return new Response('Payload too large', { status: 413 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();
  const key = `logs/${date}/${id}.ndjson`;

  await env.FEEDBACK_LOGS.put(key, body, {
    httpMetadata: { contentType: 'application/x-ndjson' },
  });

  return new Response(JSON.stringify({ key }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const RSS_MAX_BODY_SIZE = 8 * 1024 * 1024; // 8MB.
const RSS_FETCH_TIMEOUT_MS = 15_000;

/** Handle /api/rss?url=<feed-url> — server-side fetch to bypass CORS for RSS/Atom feeds. */
const handleRssProxy = async (request: Request): Promise<Response> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Restrict to same-origin / known origins to avoid being abused as an open proxy.
  // Same-origin GETs typically omit Origin; allow when absent or when a known origin is set.
  const origin = request.headers.get('Origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(request.url);
  const feedUrl = url.searchParams.get('url');
  if (!feedUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let parsedFeedUrl: URL;
  try {
    parsedFeedUrl = new URL(feedUrl);
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }
  if (parsedFeedUrl.protocol !== 'http:' && parsedFeedUrl.protocol !== 'https:') {
    return new Response('Invalid url protocol', { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RSS_FETCH_TIMEOUT_MS);
  try {
    const upstream = await fetch(parsedFeedUrl.toString(), {
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      signal: controller.signal,
    });

    const contentLength = Number(upstream.headers.get('content-length') ?? 0);
    if (contentLength > RSS_MAX_BODY_SIZE) {
      return new Response('Payload too large', { status: 413 });
    }

    // Cap response size during streaming as well, in case Content-Length is missing or false.
    let byteCount = 0;
    let sizeExceeded = false;
    const sizeCap = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, sink) {
        byteCount += chunk.byteLength;
        if (byteCount > RSS_MAX_BODY_SIZE) {
          sizeExceeded = true;
          sink.error(new Error('Payload too large'));
        } else {
          sink.enqueue(chunk);
        }
      },
    });

    const contentType = upstream.headers.get('content-type') ?? 'application/xml';
    const headers: Record<string, string> = { 'content-type': contentType };
    if (upstream.body) {
      upstream.body.pipeTo(sizeCap.writable).catch(() => {});
    }
    return new Response(upstream.body ? sizeCap.readable : null, {
      status: sizeExceeded ? 413 : upstream.status,
      headers,
    });
  } catch (error) {
    return new Response(`Bad gateway: ${String(error)}`, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
};

const OTEL_PREFIX = '/api/otel';
const OTEL_SIGNALS = new Set(['/v1/traces', '/v1/logs', '/v1/metrics']);

/** Reverse-proxy OTel ingestion to SigNoz, injecting the access token server-side. */
const handleOtelProxy = async (request: Request, env: Env, signal: string): Promise<Response> => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
  }

  // Reject requests from disallowed origins server-side, not just via CORS headers.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders(origin) });
  }

  if (!env.SIGNOZ_INGEST_URL || !env.SIGNOZ_INGESTION_KEY) {
    return new Response('OTel proxy not configured', { status: 503, headers: corsHeaders(origin) });
  }

  if (!request.body) {
    return new Response('Empty body', { status: 400, headers: corsHeaders(origin) });
  }

  const upstreamHeaders: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
    'signoz-ingestion-key': env.SIGNOZ_INGESTION_KEY,
  };
  const contentEncoding = request.headers.get('Content-Encoding');
  if (contentEncoding) {
    upstreamHeaders['Content-Encoding'] = contentEncoding;
  }
  const contentLengthHeader = request.headers.get('Content-Length');
  if (contentLengthHeader) {
    upstreamHeaders['Content-Length'] = contentLengthHeader;
  }

  // Count bytes as they stream; abort and return 413 if MAX_BODY_SIZE is exceeded.
  // This guards against missing or falsified Content-Length headers.
  let byteCount = 0;
  let sizeExceeded = false;
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      byteCount += chunk.byteLength;
      if (byteCount > MAX_BODY_SIZE) {
        sizeExceeded = true;
        controller.error(new Error('Payload too large'));
      } else {
        controller.enqueue(chunk);
      }
    },
  });

  // Pipe incoming body through the size-checking transform concurrently with the upstream fetch.
  const pipePromise = request.body.pipeTo(writable).catch(() => {});

  const upstream = `${env.SIGNOZ_INGEST_URL.replace(/\/$/, '')}${signal}`;
  let upstreamResponse: Response | null = null;
  try {
    upstreamResponse = await fetch(upstream, {
      method: 'POST',
      headers: upstreamHeaders,
      body: readable,
    });
  } catch {
    // fetch throws when the readable stream is aborted (e.g. size limit exceeded).
  }

  await pipePromise;

  if (sizeExceeded) {
    return new Response('Payload too large', { status: 413, headers: corsHeaders(origin) });
  }

  if (!upstreamResponse) {
    return new Response('Bad gateway', { status: 502, headers: corsHeaders(origin) });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json',
      ...corsHeaders(origin),
    },
  });
};

/**
 * Cloudflare Pages Functions Advanced mode set-up.
 * https://developers.cloudflare.com/pages/functions/advanced-mode
 * Output _worker.js to <pages_build_output_dir> and deploy via git.
 */
const handler: ExportedHandler<Env> = {
  fetch: async (request, env, _context) => {
    const url = new URL(request.url);

    // API routes.
    if (url.pathname === '/api/feedback-logs') {
      return handleFeedbackLogs(request, env);
    }

    if (url.pathname === '/api/rss') {
      return handleRssProxy(request);
    }

    // OTel ingestion proxy.
    if (url.pathname.startsWith(OTEL_PREFIX)) {
      const signal = url.pathname.slice(OTEL_PREFIX.length);
      if (OTEL_SIGNALS.has(signal)) {
        return handleOtelProxy(request, env, signal);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

export default handler;
