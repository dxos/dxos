//
// Copyright 2026 DXOS.org
//

/**
 * Lightweight HTML helpers used by the Magazine curation flow.
 * Regex-based; deliberately avoids a parser dependency. Good enough for
 * snippet preview and image discovery; not a content extractor.
 */

const DEFAULT_SNIPPET_LENGTH = 280;

/** Decode numeric (decimal + hex) and a handful of common named HTML entities. */
const decodeEntities = (input: string): string =>
  input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const cp = Number.parseInt(hex, 16);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const cp = Number.parseInt(dec, 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : '';
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

/** Strip HTML tags and decode common entities to produce plain text. */
export const stripHtml = (html: string): string => {
  if (!html) {
    return '';
  }
  // Remove script/style blocks entirely.
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim();
};

/** Produce a snippet of approximately `length` characters, cut on a word boundary. */
export const makeSnippet = (text: string, length: number = DEFAULT_SNIPPET_LENGTH): string => {
  if (!text) {
    return '';
  }
  if (text.length <= length) {
    return text;
  }
  const clipped = text.slice(0, length);
  const lastSpace = clipped.lastIndexOf(' ');
  const base = lastSpace > length * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return `${base.trimEnd()}…`;
};

/** Extract image URLs from HTML. og:image (meta property) first, then <img src="...">. */
export const extractImageUrls = (html: string): string[] => {
  if (!html) {
    return [];
  }
  const urls: string[] = [];
  // Attributes may appear in either order on <meta>, so try both.
  const ogMatch =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch?.[1]) {
    urls.push(ogMatch[1]);
  }
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) != null) {
    if (match[1] && !urls.includes(match[1])) {
      urls.push(match[1]);
    }
  }
  return urls;
};
