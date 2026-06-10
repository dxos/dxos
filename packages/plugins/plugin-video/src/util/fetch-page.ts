//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { proxyFetchLegacy } from '@dxos/edge-client';
import { log } from '@dxos/log';

/**
 * Page side of the Composer extension's render-proxy contract.
 *
 * The extension renders a URL in a real browser tab and returns the rendered HTML, letting us read
 * pages a plain HTTP proxy cannot (anti-bot / consent-gated / client-rendered targets). The wire
 * shapes and event names mirror `packages/apps/composer-crx/src/proxy/types.ts` (the source of
 * truth); they are re-declared here because the plugin must not depend on the extension app package.
 * See `plugin-commerce/src/util/renderViaCrx.ts` for the analogous declaration.
 */

const RENDER_EVENT = 'composer:proxy:render';
const RENDER_ACK_EVENT = 'composer:proxy:render:ack';
const RENDER_READY_DATASET_KEY = 'composerProxy';
const DEFAULT_RENDER_TIMEOUT_MS = 20_000;

export class FetchError extends Error {}

type RenderRequest = {
  version: 1;
  id: string;
  url: string;
  timeoutMs: number;
};

type RenderAck =
  | { version: 1; id: string; ok: true; html: string; finalUrl: string }
  | { version: 1; id: string; ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const decodeAck = (value: unknown): RenderAck | undefined => {
  if (!isRecord(value) || value.version !== 1 || typeof value.id !== 'string') {
    return undefined;
  }
  if (value.ok === true && typeof value.html === 'string' && typeof value.finalUrl === 'string') {
    return { version: 1, id: value.id, ok: true, html: value.html, finalUrl: value.finalUrl };
  }
  if (value.ok === false && typeof value.error === 'string') {
    return { version: 1, id: value.id, ok: false, error: value.error };
  }
  return undefined;
};

let counter = 0;
const nextId = (): string => globalThis.crypto?.randomUUID?.() ?? `render-${(counter += 1)}`;

/**
 * Whether the Composer extension's render-proxy relay is installed on this page. The relay sets a
 * `documentElement` dataset marker once it is listening, so this is a synchronous probe.
 */
export const isCrxRenderAvailable = (): boolean =>
  typeof document !== 'undefined' && document.documentElement?.dataset[RENDER_READY_DATASET_KEY] === '1';

/**
 * Fetch a page's HTML, preferring the Composer extension render-proxy (which loads the real page in
 * a browser tab) and falling back to the EDGE CORS proxy when the extension is unavailable or fails.
 */
export const fetchPage = (url: string): Effect.Effect<string, FetchError> => {
  if (!isCrxRenderAvailable()) {
    return fetchResource(url);
  }
  return renderViaCrx(url).pipe(
    Effect.catchAll((error) => {
      log.info('render-proxy failed; falling back to edge proxy', { url, error: error.message });
      return fetchResource(url);
    }),
  );
};

/**
 * Fetch a raw resource body as text through the EDGE CORS proxy. Use this (rather than {@link
 * fetchPage}) for data endpoints — e.g. a caption timed-text URL — where the rendered-DOM result of
 * the CRX render-proxy would corrupt a non-HTML response.
 */
export const fetchResource = (url: string): Effect.Effect<string, FetchError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await proxyFetchLegacy(new URL(url), { method: 'GET' });
      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status} for ${url}`);
      }
      return response.text();
    },
    catch: (error) => (error instanceof FetchError ? error : new FetchError(String(error))),
  });

// YouTube's InnerTube `player` endpoint, queried as the ANDROID app client. Unlike the web client,
// the ANDROID client's caption `baseUrl`s are not gated behind a BotGuard proof-of-origin (`pot`)
// token, so they can be fetched directly through the CORS proxy. The API key is YouTube's public,
// hard-coded ANDROID client key (not a secret); the client version is bumped periodically by YouTube.
const PLAYER_ENDPOINT = 'https://www.youtube.com/youtubei/v1/player';
const ANDROID_API_KEY = 'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w';
const ANDROID_CLIENT_VERSION = '20.10.38';
const ANDROID_USER_AGENT = `com.google.android.youtube/${ANDROID_CLIENT_VERSION} (Linux; U; Android 11) gzip`;

/**
 * Fetch a YouTube video's player response (caption tracks, video details) via the InnerTube `player`
 * endpoint, through the EDGE CORS proxy. Returns the parsed JSON; callers narrow it with the
 * `youtube` parsers.
 *
 * The browser forces an `Origin: <app>` header onto the cross-origin POST, and YouTube's InnerTube
 * API rejects a foreign origin with 403. We can't strip `Origin` from a browser `fetch`, so we use
 * the CORS proxy's `x-cors-proxy-*` override mechanism to replace the upstream `Origin` (and set the
 * ANDROID `User-Agent`, which the browser also forbids setting directly) before it reaches YouTube.
 */
export const fetchYouTubePlayer = (videoId: string): Effect.Effect<unknown, FetchError> =>
  Effect.tryPromise({
    try: async () => {
      const target = new URL(PLAYER_ENDPOINT);
      target.searchParams.set('key', ANDROID_API_KEY);
      const response = await proxyFetchLegacy(target, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-cors-proxy-origin': 'https://www.youtube.com',
          'x-cors-proxy-user-agent': ANDROID_USER_AGENT,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: ANDROID_CLIENT_VERSION,
              androidSdkVersion: 30,
              hl: 'en',
              gl: 'US',
            },
          },
          videoId,
        }),
      });
      if (!response.ok) {
        throw new FetchError(`YouTube player API returned HTTP ${response.status}`);
      }
      return response.json();
    },
    catch: (error) => (error instanceof FetchError ? error : new FetchError(String(error))),
  });

const renderViaCrx = (url: string): Effect.Effect<string, FetchError> =>
  Effect.async<string, FetchError>((resume) => {
    if (typeof window === 'undefined' || !isCrxRenderAvailable()) {
      resume(Effect.fail(new FetchError('Composer render-proxy extension is not available')));
      return;
    }

    const id = nextId();
    const timeoutMs = DEFAULT_RENDER_TIMEOUT_MS;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener(RENDER_ACK_EVENT, onAck);
      clearTimeout(timer);
    };

    const onAck = (event: Event) => {
      const detail = 'detail' in event ? event.detail : undefined;
      const ack = decodeAck(detail);
      if (!ack || ack.id !== id || settled) {
        return;
      }
      settled = true;
      cleanup();
      if (ack.ok) {
        resume(Effect.succeed(ack.html));
      } else {
        resume(Effect.fail(new FetchError(`render-proxy failed: ${ack.error}`)));
      }
    };

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resume(Effect.fail(new FetchError(`render-proxy timed out after ${timeoutMs}ms for ${url}`)));
    }, timeoutMs + 1_000);

    window.addEventListener(RENDER_ACK_EVENT, onAck);

    const request: RenderRequest = { version: 1, id, url, timeoutMs };
    window.dispatchEvent(new CustomEvent(RENDER_EVENT, { detail: request }));

    return Effect.sync(() => {
      if (!settled) {
        settled = true;
        cleanup();
      }
    });
  });
