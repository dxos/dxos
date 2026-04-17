//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import { log } from '@dxos/log';

/** Fetched-content cache, shared across hook instances. */
const urlCache = new Map<string, { text: string; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_TEXT_LENGTH = 4000;

const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/g;

/** Strip HTML tags and collapse whitespace. Intentionally dumb — works across most pages. */
const htmlToText = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

/** Extract up to `limit` URLs from a blob of text, de-duplicated, in order of appearance. */
export const extractUrls = (text: string, limit = 5): string[] => {
  const seen = new Set<string>();
  const urls: string[] = [];
  const matches = text.match(URL_REGEX) ?? [];
  for (const match of matches) {
    // Strip trailing punctuation that often attaches to URLs in prose.
    const cleaned = match.replace(/[.,;:!?)"']+$/, '');
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      urls.push(cleaned);
      if (urls.length >= limit) {
        break;
      }
    }
  }
  return urls;
};

/**
 * Fetches public web URLs via the dev proxy and returns extracted plain text.
 * Uses an in-memory LRU-ish cache (TTL-based). Content-agnostic — doesn't know
 * about any specific site.
 */
export const useUrlEnricher = () => {
  const fetchUrl = useCallback(async (url: string): Promise<string | undefined> => {
    const cached = urlCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.text;
    }
    try {
      const response = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        log.info('urlEnricher: fetch failed', { url, status: response.status });
        return undefined;
      }
      const contentType = response.headers.get('content-type') ?? '';
      const raw = await response.text();
      const text = contentType.includes('html') ? htmlToText(raw) : raw;
      const capped = text.slice(0, MAX_TEXT_LENGTH);
      urlCache.set(url, { text: capped, timestamp: Date.now() });
      return capped;
    } catch (err) {
      log.info('urlEnricher: fetch error', { url, error: String(err) });
      return undefined;
    }
  }, []);

  /** Fetch many URLs in parallel; skip any that fail. Returns url → extracted text. */
  const fetchMany = useCallback(
    async (urls: string[]): Promise<Map<string, string>> => {
      const results = await Promise.all(
        urls.map(async (url) => [url, await fetchUrl(url)] as const),
      );
      const map = new Map<string, string>();
      for (const [url, text] of results) {
        if (text) {
          map.set(url, text);
        }
      }
      return map;
    },
    [fetchUrl],
  );

  return { fetchUrl, fetchMany };
};
