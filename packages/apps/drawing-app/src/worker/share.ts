//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';

/** The share API's route; `POST` stores a drawing's source, `GET <path>/<id>` reads it back. */
export const SHARE_PATH = '/api/share';

/** Larger than any diagram the skill asks for by orders of magnitude, small enough that the bucket is no file host. */
export const MAX_SOURCE_BYTES = 256 * 1024;

/** A share read after this long is written again, which restarts the bucket's 30-day lifecycle clock. */
export const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

/** What the app shows, and the API answers, for an id the bucket does not hold. */
export const NOT_FOUND_MESSAGE = 'This link has expired or never existed.';

/** The landing page's live editor posts from these origins; local dev servers may run on any port. */
const ALLOWED_ORIGINS = new Set(['https://drawing.sh', 'https://www.drawing.sh']);
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/** 128 random bits as base64url, so a link is a capability nobody can guess or enumerate. */
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** The drawing's name rides along as `?name=` on the POST and comes back in this header, for the app's title. */
export const NAME_HEADER = 'X-Drawing-Name';

/** Names are file-name-ish, so they survive a header and need no escaping where the app shows them. */
const toName = (value: string | null): string | undefined => {
  const name = value
    ?.replace(/[^\w .-]+/g, '')
    .trim()
    .slice(0, 100);
  return name || undefined;
};

/** The part of an R2 object a share reads; `R2ObjectBody` satisfies it. */
export type ShareObject = {
  readonly uploaded: Date;
  readonly customMetadata?: Record<string, string>;
  text(): Promise<string>;
};

export type SharePutOptions = {
  readonly httpMetadata?: { readonly contentType?: string };
  readonly customMetadata?: Record<string, string>;
};

/** The part of `R2Bucket` the share API uses; `R2Bucket` satisfies it, and a test can stand a map in for it. */
export type ShareBucket = {
  get(key: string): Promise<ShareObject | null>;
  put(key: string, value: string, options?: SharePutOptions): Promise<unknown>;
};

/** Cloudflare's rate-limiting binding (`ratelimits` in `wrangler.jsonc`). */
export type ShareRateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type ShareEnv = {
  readonly SHARES: ShareBucket;
  /** Unbound in tests that do not exercise it, where every request is allowed. */
  readonly SHARE_RATE_LIMIT?: ShareRateLimiter;
};

export type ShareOptions = {
  /** The clock, so a test can age a share past the refresh threshold. */
  readonly now?: () => number;
};

/** A new share id: 16 bytes from the platform CSPRNG, base64url without padding. */
export const newShareId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
};

/** CORS for the drawing.sh origins only, echoing the matched origin so no other site reads a response. */
const corsHeaders = (request: Request): Record<string, string> => {
  const origin = request.headers.get('Origin');
  if (!origin || !(ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin))) {
    return {};
  }
  return { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' };
};

const respond = (request: Request, body: string | null, status: number, headers: Record<string, string> = {}) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...corsHeaders(request),
      ...headers,
    },
  });

const create = Effect.fn('create')(function* (request: Request, env: ShareEnv, now: () => number) {
  if (env.SHARE_RATE_LIMIT) {
    const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const limiter = env.SHARE_RATE_LIMIT;
    const { success } = yield* Effect.promise(() => limiter.limit({ key }));
    if (!success) {
      return respond(request, 'Too many shares; try again in a minute.', 429, { 'Retry-After': '60' });
    }
  }

  // The header is only a fast path; the body is measured too, since a chunked upload carries no length.
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_SOURCE_BYTES) {
    return respond(request, `A drawing's source is limited to ${MAX_SOURCE_BYTES} bytes.`, 413);
  }
  const body = yield* Effect.promise(() => request.arrayBuffer());
  if (body.byteLength > MAX_SOURCE_BYTES) {
    return respond(request, `A drawing's source is limited to ${MAX_SOURCE_BYTES} bytes.`, 413);
  }

  const decoded = yield* Effect.try(() => new TextDecoder('utf-8', { fatal: true }).decode(body)).pipe(Effect.option);
  if (Option.isNone(decoded)) {
    return respond(request, 'The source must be UTF-8 text.', 400);
  }
  const text = decoded.value;
  if (text.trim().length === 0) {
    return respond(request, 'The source is empty.', 400);
  }

  const id = newShareId();
  const name = toName(new URL(request.url).searchParams.get('name'));
  yield* Effect.promise(() =>
    env.SHARES.put(id, text, {
      httpMetadata: { contentType: 'text/plain; charset=utf-8' },
      customMetadata: { lastOpened: new Date(now()).toISOString(), ...(name ? { name } : {}) },
    }),
  );
  const url = `${new URL(request.url).origin}/?d=${id}`;
  return respond(request, JSON.stringify({ id, url }), 201, { 'Content-Type': 'application/json' });
});

const read = Effect.fn('read')(function* (request: Request, env: ShareEnv, id: string, now: () => number) {
  if (!ID_PATTERN.test(id)) {
    return respond(request, NOT_FOUND_MESSAGE, 404);
  }
  const object = yield* Effect.promise(() => env.SHARES.get(id));
  if (!object) {
    return respond(request, NOT_FOUND_MESSAGE, 404);
  }
  const text = yield* Effect.promise(() => object.text());
  // R2 lifecycle rules count from the last write, so rewriting a share that is being opened keeps it alive.
  if (now() - object.uploaded.getTime() > REFRESH_AFTER_MS) {
    yield* Effect.promise(() =>
      env.SHARES.put(id, text, {
        httpMetadata: { contentType: 'text/plain; charset=utf-8' },
        customMetadata: { ...object.customMetadata, lastOpened: new Date(now()).toISOString() },
      }),
    );
  }
  const name = toName(object.customMetadata?.name ?? null);
  return respond(request, text, 200, {
    'Content-Security-Policy': "default-src 'none'",
    ...(name ? { [NAME_HEADER]: name, 'Access-Control-Expose-Headers': NAME_HEADER } : {}),
  });
});

const route = (request: Request, env: ShareEnv, now: () => number): Effect.Effect<Response> => {
  const { pathname } = new URL(request.url);
  if (request.method === 'OPTIONS') {
    return Effect.succeed(
      respond(request, null, 204, {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      }),
    );
  }
  if (pathname === SHARE_PATH) {
    return request.method === 'POST'
      ? create(request, env, now)
      : Effect.succeed(respond(request, 'Method not allowed', 405, { Allow: 'POST, OPTIONS' }));
  }
  const id = pathname.slice(SHARE_PATH.length + 1);
  return request.method === 'GET'
    ? read(request, env, id, now)
    : Effect.succeed(respond(request, 'Method not allowed', 405, { Allow: 'GET, OPTIONS' }));
};

/**
 * Serves `/api/share` and `/api/share/<id>`. Only `.dx` source text is stored, and it is only ever served as
 * `text/plain` with `nosniff`, so the bucket cannot host active content.
 */
export const handleShare = async (
  request: Request,
  env: ShareEnv,
  { now = Date.now }: ShareOptions = {},
): Promise<Response> => {
  // The exit, not `EffectEx.runPromise`, so the Worker bundle carries no `@dxos/effect` runtime.
  const exit = await Effect.runPromiseExit(route(request, env, now));
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  console.error('share request failed', Cause.pretty(exit.cause));
  return respond(request, 'Internal error', 500);
};

/** True for the paths `handleShare` serves. */
export const isSharePath = (pathname: string) => pathname === SHARE_PATH || pathname.startsWith(`${SHARE_PATH}/`);
