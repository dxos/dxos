//
// Copyright 2026 DXOS.org
//

import { extractImageUrls, stripHtml } from './extract';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_RESPONSE_BYTES_HEADER = 5_000_000;

/**
 * Exact-match hostname denylist. Defense-in-depth against trivial SSRF when
 * this runs in a trusted/worker context. Not a substitute for DNS-level
 * egress filtering when available.
 */
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/GCP/Azure instance metadata endpoint.
  'metadata.google.internal',
]);

/** Throws unless `link` is an http(s) URL targeting a non-loopback, non-metadata host. */
const validateUrl = (link: string): URL => {
  const url = new URL(link);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error(`Blocked host: ${host}`);
  }
  return url;
};

/**
 * Read the body with a hard byte cap; prevents unbounded memory use on
 * adversarial responses. Throws if the stream API is unavailable so we never
 * silently bypass the cap.
 */
const readCapped = async (response: Response, limit: number): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body stream unavailable.');
  }
  const decoder = new TextDecoder('utf-8');
  let received = 0;
  let out = '';
  while (received < limit) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      received += value.byteLength;
      out += decoder.decode(value, { stream: true });
    }
  }
  try {
    await reader.cancel();
  } catch {
    // Ignore cancel errors.
  }
  return (out + decoder.decode()).slice(0, limit);
};

export type FetchArticleResult = {
  /** Plain-text body extracted from the article HTML. */
  text: string;
  /** Image URLs found on the page (og:image first, then <img src=...>). */
  imageUrls: string[];
};

export type FetchArticleOptions = {
  /**
   * URL prefix for a server-side fetch proxy used to bypass browser CORS.
   * The target URL is appended (URL-encoded). E.g. `'/api/rss?url='`.
   * When omitted, the article is fetched directly.
   */
  corsProxy?: string;
};

/**
 * Fetches a post's article page over HTTP and returns extracted plain text
 * plus any image URLs found. Applies protocol validation, a fetch timeout,
 * a Content-Length rejection, and a streamed byte cap.
 *
 * Wraps the original error as `cause` so callers can distinguish
 * AbortError (timeout) from network/fetch failures.
 */
export const fetchArticle = async (link: string, options: FetchArticleOptions = {}): Promise<FetchArticleResult> => {
  try {
    const url = validateUrl(link);
    const fetchTarget = options.corsProxy
      ? `${options.corsProxy}${encodeURIComponent(url.toString())}`
      : url.toString();
    const response = await fetch(fetchTarget, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES_HEADER) {
      throw new Error(`Response too large: ${contentLength} bytes`);
    }
    const html = await readCapped(response, MAX_RESPONSE_BYTES);
    return {
      text: stripHtml(html),
      imageUrls: extractImageUrls(html),
    };
  } catch (error) {
    throw new Error(`Failed to fetch article: ${String(error)}`, {
      cause: error instanceof Error ? error : undefined,
    });
  }
};
