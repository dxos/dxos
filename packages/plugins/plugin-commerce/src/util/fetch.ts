//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { proxyFetchLegacy } from '@dxos/edge-client';
import { log } from '@dxos/log';

import { type HttpRequest } from './bindRequest';
import { isCrxRenderAvailable, renderViaCrx } from './renderViaCrx';

export class FetchError extends Error {}

/** Perform an HTTP request through the DXOS edge proxy and return the response body as text. */
export const fetchViaProxy = (request: HttpRequest): Effect.Effect<string, FetchError> =>
  Effect.tryPromise({
    try: async () => {
      const response = await proxyFetchLegacy(new URL(request.url), {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status} for ${request.url}`);
      }
      return response.text();
    },
    catch: (error) => (error instanceof FetchError ? error : new FetchError(String(error))),
  });

export type FetchPageOptions = {
  // Prefer rendering the page in a real browser (via the Composer extension) when available.
  render?: boolean;
  // CSS selector to await before reading rendered HTML (only when rendering).
  waitForSelector?: string;
  // Render in a focused (foreground) tab — helps sites that gate background tabs.
  active?: boolean;
};

/**
 * Fetch a page body, choosing the best available transport:
 *   - when `render` is requested and the Composer render-proxy extension is present, render the
 *     page in a real browser tab (handles client-rendered / anti-bot SPA targets);
 *   - otherwise (or if the render fails) fall back to the edge HTTP proxy.
 * GET-only requests can be rendered; POST requests always use the proxy.
 */
export const fetchPage = (request: HttpRequest, options: FetchPageOptions = {}): Effect.Effect<string, FetchError> => {
  const canRender = options.render && request.method === 'GET' && isCrxRenderAvailable();
  log.info('fetchPage', {
    url: request.url,
    method: request.method,
    renderRequested: Boolean(options.render),
    crxAvailable: isCrxRenderAvailable(),
    via: canRender ? 'crx' : 'proxy',
  });
  if (!canRender) {
    return fetchViaProxy(request);
  }
  return renderViaCrx(request.url, { waitForSelector: options.waitForSelector, active: options.active }).pipe(
    Effect.catchAll((error) => {
      log.info('render-proxy failed; falling back to edge proxy', { url: request.url, error: error.message });
      return fetchViaProxy(request);
    }),
  );
};
