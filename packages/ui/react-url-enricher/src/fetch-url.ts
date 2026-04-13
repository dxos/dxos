//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { htmlToText } from './html-to-text';

export type FetchUrlOptions = {
  /**
   * Endpoint that proxies the request to bypass CORS. The URL is appended as
   * a `url` query parameter. Default: `/api/fetch` (Composer's dev proxy).
   */
  endpoint?: string;
  /** Maximum characters of extracted text to return (and cache). Default 4000. */
  maxLength?: number;
  /** Optional AbortSignal. */
  signal?: AbortSignal;
};

type CacheEntry = { text: string; timestamp: number };

const DEFAULT_ENDPOINT = '/api/fetch';
const DEFAULT_MAX_LENGTH = 4000;
const CACHE_TTL_MS = 15 * 60 * 1000;

/** Module-level TTL cache shared across callers. */
const urlCache = new Map<string, CacheEntry>();

/**
 * Fetch a public web URL via a proxy endpoint and return extracted plain text.
 * Uses an in-memory TTL cache (15 min). Returns `undefined` on any failure —
 * callers are expected to fall through gracefully.
 */
export const fetchUrl = async (url: string, options: FetchUrlOptions = {}): Promise<string | undefined> => {
  const { endpoint = DEFAULT_ENDPOINT, maxLength = DEFAULT_MAX_LENGTH, signal } = options;
  const cacheKey = `${endpoint}::${url}::${maxLength}`;
  const cached = urlCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.text;
  }
  try {
    const response = await fetch(`${endpoint}?url=${encodeURIComponent(url)}`, { signal });
    if (!response.ok) {
      log.info('urlEnricher: fetch failed', { url, status: response.status });
      return undefined;
    }
    const contentType = response.headers.get('content-type') ?? '';
    const raw = await response.text();
    const text = contentType.includes('html') ? htmlToText(raw) : raw;
    const capped = text.slice(0, maxLength);
    urlCache.set(cacheKey, { text: capped, timestamp: Date.now() });
    return capped;
  } catch (err) {
    log.info('urlEnricher: fetch error', { url, error: String(err) });
    return undefined;
  }
};

/**
 * Fetch many URLs in parallel; skip any that fail. Returns a map from URL to
 * extracted plain text. URLs that failed are simply absent from the map.
 */
export const fetchManyUrls = async (
  urls: readonly string[],
  options: FetchUrlOptions = {},
): Promise<Map<string, string>> => {
  const results = await Promise.all(urls.map(async (url) => [url, await fetchUrl(url, options)] as const));
  const map = new Map<string, string>();
  for (const [url, text] of results) {
    if (text) {
      map.set(url, text);
    }
  }
  return map;
};

/** Testing hook: clear the module-level cache. */
export const clearUrlCache = (): void => {
  urlCache.clear();
};
