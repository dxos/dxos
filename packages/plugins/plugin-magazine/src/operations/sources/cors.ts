//
// Copyright 2026 DXOS.org
//

/**
 * Cross-origin fetch helpers. Feed/article URLs are arbitrary third-party origins, so in the browser
 * they must be routed through the dev/edge RSS proxy; server-side (no `window`) they're fetched
 * directly.
 */

/** Browser proxy path; the target URL is appended URL-encoded. */
export const CORS_PROXY = '/api/rss?url=';

/** The proxy to use in the current environment: the browser proxy, or undefined server-side. */
export const browserCorsProxy = (): string | undefined => (typeof window !== 'undefined' ? CORS_PROXY : undefined);

/** Wraps `url` with `proxy` (URL-encoded) when a proxy is set, else returns `url` unchanged. */
export const applyCorsProxy = (url: string, proxy?: string): string =>
  proxy ? `${proxy}${encodeURIComponent(url)}` : url;
