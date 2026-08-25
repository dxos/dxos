//
// Copyright 2024 DXOS.org
//

// Import from the focused leaf modules rather than the `../util` barrel: the barrel re-exports
// modules (config/halo/storage) that pull Automerge's wasm into this Cloudflare Worker bundle, which
// esbuild cannot load.
import { FEEDBACK_LOGS_PATH, LOG_STORE_MAX_BYTES } from '../util/constants';
import { corsHeaders, isAllowedOrigin, nativeOrigins } from '../util/cors';

type Env = {
  ASSETS: Fetcher;
  APPLE_TEAM_ID?: string;
  ENVIRONMENT?: string;
  FEEDBACK_LOGS?: R2Bucket;
  SIGNOZ_INGEST_URL?: string;
  SIGNOZ_INGESTION_KEY?: string;
};

const OTEL_MAX_BODY_SIZE = 800 * 1024 * 1024; // 800MB.
const FEEDBACK_LOGS_MAX_BODY_SIZE = LOG_STORE_MAX_BYTES;

/**
 * Handle /api/feedback-logs — upload NDJSON debug logs to R2.
 *
 * Admits `nativeOrigins`, whose uploads are necessarily cross-origin, and carries the CORS headers on
 * every response, since the client reads the returned key.
 */
const handleFeedbackLogs = async (request: Request, env: Env): Promise<Response> => {
  const origin = request.headers.get('Origin');
  const allowed = nativeOrigins(env.ENVIRONMENT);
  const cors = corsHeaders(request.url, origin, allowed);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  // Rejected server-side, not just via CORS headers; a missing `Origin` means a client no
  // same-origin policy is holding back, on a route that writes megabytes to storage.
  if (!origin || !isAllowedOrigin(request.url, origin, allowed)) {
    return new Response('Forbidden', { status: 403, headers: cors });
  }

  if (!env.FEEDBACK_LOGS) {
    return new Response('Feedback logs storage not configured', { status: 503, headers: cors });
  }

  // R2 only accepts a known-length stream, so Content-Length is required rather than advisory: it
  // is both the size guard and what lets the body go straight to R2 unbuffered.
  const contentLengthHeader = request.headers.get('content-length');
  const contentLength = contentLengthHeader === null ? Number.NaN : Number(contentLengthHeader);
  if (!Number.isInteger(contentLength) || contentLength < 0) {
    return new Response('Content-Length required', { status: 411, headers: cors });
  }

  if (contentLength === 0) {
    return new Response('Empty body', { status: 400, headers: cors });
  }

  if (contentLength > FEEDBACK_LOGS_MAX_BODY_SIZE) {
    return new Response('Payload too large', { status: 413, headers: cors });
  }

  if (!request.body) {
    return new Response('Empty body', { status: 400, headers: cors });
  }

  const date = new Date().toISOString().slice(0, 10);
  const id = crypto.randomUUID();
  const key = `logs/${date}/${id}.ndjson`;

  try {
    // Hand R2 the request body itself: `arrayBuffer()` would hold the whole dump in the isolate,
    // near its memory limit, and a Worker torn down that way resets the connection — the client
    // then sees a rejected `fetch` with no status rather than an error response.
    await env.FEEDBACK_LOGS.put(key, request.body, {
      httpMetadata: { contentType: 'application/x-ndjson' },
    });
  } catch {
    // R2 rejects a body that does not match Content-Length, as well as its own failures.
    return new Response('Failed to store feedback logs', { status: 502, headers: cors });
  }

  return new Response(JSON.stringify({ key }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
};

const RSS_MAX_BODY_SIZE = 8 * 1024 * 1024; // 8MB.
const RSS_FETCH_TIMEOUT_MS = 15_000;

/**
 * Handle /api/rss?url=<feed-url> — server-side fetch to bypass CORS for RSS/Atom feeds.
 *
 * A proxy is required for the general case: the browser's same-origin policy blocks
 * cross-origin `fetch()` of any response that doesn't send `Access-Control-Allow-Origin`,
 * and RSS/Atom feeds are overwhelmingly served by CMSes (WordPress, Substack, news sites,
 * etc.) that don't set CORS headers, so a direct browser fetch fails before the body is
 * even read. Alternatives considered: (1) try direct, fall back to proxy — saves a hop
 * for CORS-friendly feeds but every "no-CORS" feed pays a wasted round-trip and a console
 * error before the fallback runs; (2) `mode: 'no-cors'` — the response becomes opaque, the
 * body is unreadable; (3) move the fetcher out of the browser entirely (scheduled
 * worker/edge function) — cleanest long-term but a much bigger change. We always proxy
 * for simplicity; the cost is a hop and some Worker CPU.
 */
const handleRssProxy = async (request: Request): Promise<Response> => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Restrict to same-origin, to avoid being abused as an open proxy.
  const origin = request.headers.get('Origin');
  if (!isAllowedOrigin(request.url, origin)) {
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
    // Forward the original method so HEAD probes don't download the full body upstream.
    const upstream = await fetch(parsedFeedUrl.toString(), {
      method: request.method,
      headers: { Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
      signal: controller.signal,
    });

    const contentLength = Number(upstream.headers.get('content-length') ?? 0);
    if (contentLength > RSS_MAX_BODY_SIZE) {
      return new Response('Payload too large', { status: 413 });
    }

    const contentType = upstream.headers.get('content-type') ?? 'application/xml';
    const headers: Record<string, string> = { 'content-type': contentType };

    // For HEAD or empty bodies, return immediately with the upstream status — no body to cap.
    if (request.method === 'HEAD' || !upstream.body) {
      return new Response(null, { status: upstream.status, headers });
    }

    // Buffer the body up to the cap so the response status can be decided deterministically
    // (a TransformStream-based cap can't influence Response.status, since Response is
    // constructed synchronously before any chunks have flowed through).
    const reader = upstream.body.getReader();
    const chunks: Uint8Array[] = [];
    let byteCount = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      byteCount += value.byteLength;
      if (byteCount > RSS_MAX_BODY_SIZE) {
        await reader.cancel();
        return new Response('Payload too large', { status: 413 });
      }
      chunks.push(value);
    }

    return new Response(new Blob(chunks as BlobPart[]), {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return new Response(`Bad gateway: ${String(error)}`, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Origins permitted to assert the `composer.space` relying party via WebAuthn Related Origin
 * Requests.
 *
 * Composer registers passkeys with `rp: { id: location.hostname }` (plugin-client
 * `create-passkey.ts`), so production credentials are permanently scoped to the `composer.space`
 * relying party. WebAuthn otherwise only lets a page assert an RP ID that is a registrable-domain
 * suffix of its own origin, which would confine every ceremony to `*.composer.space`. Listing an
 * origin here is what lets the MCP passkey ceremony — served from the `hub-service` worker on
 * `auth.dxos.network` — reach those existing credentials without re-registration.
 *
 * `composer.space` itself is deliberately absent: same-origin assertions are always permitted.
 *
 * Clients are only required to support 5 unique eTLD+1 labels, so entries are not free — but every
 * `*.composer.space` origin shares one label, and `dxos` covers `auth.dxos.network`.
 *
 * https://w3c.github.io/webauthn/#sctn-related-origins
 */
const WEBAUTHN_RELATED_ORIGINS = ['https://auth.dxos.network'];

/**
 * The native app's bundle id. Qualified by `APPLE_TEAM_ID` (wrangler.jsonc) into the `<team id>.<bundle
 * id>` form that `src-tauri/Entitlements.plist` also carries — its `associated-domains` list is the other
 * half of this handshake: a domain is only claimed when the app names it *and* the domain serves the app
 * back here.
 */
const BUNDLE_ID = 'org.dxos.composer';

/**
 * The well-known documents that verify this domain, keyed by path.
 *
 * These are Worker routes rather than static assets because both must be served as
 * `application/json` and the paths carry no extension for the asset server to infer that from. They
 * are covered by `run_worker_first` for the same reason the SPA fallback must not reach them.
 *
 * Asset routing and these routes alike ignore the hostname, so every domain mapped to this Worker —
 * composer.space and composer.dxos.org — is verified by the same documents. That is what replaced the
 * standalone `composer-dxos-org` Worker.
 */
const WELL_KNOWN_DOCUMENTS: Record<string, (env: Env) => object | undefined> = {
  // Universal Links (`applinks`) and passkeys (`webcredentials`) for the native app.
  '/.well-known/apple-app-site-association': (env) => {
    if (!env.APPLE_TEAM_ID) {
      return undefined;
    }

    const appId = `${env.APPLE_TEAM_ID}.${BUNDLE_ID}`;
    return {
      applinks: { details: [{ appIDs: [appId], components: [{ '/': '/*' }] }] },
      webcredentials: { apps: [appId] },
    };
  },
  // WebAuthn Related Origin Requests: origins permitted to assert the `composer.space` relying party.
  '/.well-known/webauthn': () => ({ origins: WEBAUTHN_RELATED_ORIGINS }),
};

/** Serve a well-known verification document. */
const handleWellKnown = (request: Request, document: object | undefined): Response => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    // RFC 9110 §15.5.6 requires a 405 to advertise the methods the resource does support.
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  // Fail loudly on missing config: a document built around an undefined team id would parse, and
  // silently un-verify the domain.
  if (!document) {
    return new Response('Verification document not configured', { status: 503 });
  }

  const body = JSON.stringify(document);
  return new Response(request.method === 'HEAD' ? null : body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300',
    },
  });
};

const OTEL_PREFIX = '/api/otel';
const OTEL_SIGNALS = new Set(['/v1/traces', '/v1/logs', '/v1/metrics']);

/** Reverse-proxy OTel ingestion to SigNoz, injecting the access token server-side. */
const handleOtelProxy = async (request: Request, env: Env, signal: string): Promise<Response> => {
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request.url, origin) });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders(request.url, origin) });
  }

  // Reject requests from disallowed origins server-side, not just via CORS headers.
  if (!isAllowedOrigin(request.url, origin)) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders(request.url, origin) });
  }

  if (!env.SIGNOZ_INGEST_URL || !env.SIGNOZ_INGESTION_KEY) {
    return new Response('OTel proxy not configured', { status: 503, headers: corsHeaders(request.url, origin) });
  }

  if (!request.body) {
    return new Response('Empty body', { status: 400, headers: corsHeaders(request.url, origin) });
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

  // Count bytes as they stream; abort and return 413 if OTEL_MAX_BODY_SIZE is exceeded.
  // This guards against missing or falsified Content-Length headers.
  let byteCount = 0;
  let sizeExceeded = false;
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      byteCount += chunk.byteLength;
      if (byteCount > OTEL_MAX_BODY_SIZE) {
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
    return new Response('Payload too large', { status: 413, headers: corsHeaders(request.url, origin) });
  }

  if (!upstreamResponse) {
    return new Response('Bad gateway', { status: 502, headers: corsHeaders(request.url, origin) });
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json',
      ...corsHeaders(request.url, origin),
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

    // Domain-verification documents (must precede the SPA fallback).
    const wellKnown = WELL_KNOWN_DOCUMENTS[url.pathname];
    if (wellKnown) {
      return handleWellKnown(request, wellKnown(env));
    }

    // API routes.
    if (url.pathname === FEEDBACK_LOGS_PATH) {
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
