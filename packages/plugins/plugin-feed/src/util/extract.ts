//
// Copyright 2026 DXOS.org
//

/**
 * Lightweight HTML helpers used by the Magazine curation flow.
 * Regex-based; deliberately avoids a parser dependency. Good enough for
 * snippet preview and image discovery; not a content extractor.
 */

const DEFAULT_SNIPPET_LENGTH = 280;

/** Strip HTML tags and decode a few common entities to produce plain text. */
export const stripHtml = (html: string): string => {
  if (!html) {
    return '';
  }
  // Remove script/style blocks entirely.
  const withoutScripts = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, ' ');
  const decoded = withoutTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
  return decoded.replace(/\s+/g, ' ').trim();
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
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
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
