//
// Copyright 2026 DXOS.org
//

/**
 * Composer's general-purpose server-side GET proxy (see composer-app `_worker.ts`). The browser's
 * same-origin policy blocks cross-origin fetches of responses without CORS headers, and the public
 * BookHive XRPC endpoint sends none, so browser fetches must go through this proxy.
 */
export const CORS_PROXY = '/api/rss?url=';

export const browserCorsProxy = (): string | undefined => (typeof window !== 'undefined' ? CORS_PROXY : undefined);

export const applyCorsProxy = (url: string, proxy?: string): string =>
  proxy ? `${proxy}${encodeURIComponent(url)}` : url;
