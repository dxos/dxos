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

const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB.

const OTEL_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Handle /api/feedback-logs — upload NDJSON debug logs to R2. */
const handleFeedbackLogs = async (request: Request, env: Env): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
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

const OTEL_PREFIX = '/api/otel';
const OTEL_SIGNALS = new Set(['/v1/traces', '/v1/logs', '/v1/metrics']);

/** Reverse-proxy OTel ingestion to SigNoz, injecting the access token server-side. */
const handleOtelProxy = async (request: Request, env: Env, signal: string): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: OTEL_CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!env.SIGNOZ_INGEST_URL || !env.SIGNOZ_INGESTION_KEY) {
    return new Response('OTel proxy not configured', { status: 503 });
  }

  const upstream = `${env.SIGNOZ_INGEST_URL}${signal}`;
  const response = await fetch(upstream, {
    method: 'POST',
    headers: {
      'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
      'signoz-access-token': env.SIGNOZ_INGESTION_KEY,
    },
    body: request.body,
  });

  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      ...OTEL_CORS_HEADERS,
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
