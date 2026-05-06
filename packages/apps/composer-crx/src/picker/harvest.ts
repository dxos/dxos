//
// Copyright 2026 DXOS.org
//

import { type ClipHints, type ClipSelection } from '../clip/types';

const MAX_HTML_LENGTH = 1_000_000;

/**
 * Pure function: extract text, HTML, and bounding rect from the picked element.
 * HTML is truncated to avoid extreme payloads (with a flag so the receiver can
 * surface a warning if needed).
 */
export const harvestSelection = (element: Element): ClipSelection => {
  const html = element.outerHTML ?? '';
  const truncated = html.length > MAX_HTML_LENGTH;
  const rect = 'getBoundingClientRect' in element ? (element as HTMLElement).getBoundingClientRect() : undefined;
  return {
    text: (element as HTMLElement).innerText ?? element.textContent ?? '',
    html: truncated ? html.slice(0, MAX_HTML_LENGTH) : html,
    htmlTruncated: truncated || undefined,
    rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined,
  };
};

/**
 * Pure function: collect cheap page-wide signals at pick time. Used as a
 * best-effort fallback by the receiver and (in future) by an agent-assisted
 * enrichment stage.
 *
 * Accepts a Document so the same logic can be unit-tested with a jsdom tree.
 */
export const harvestHints = (doc: Document): ClipHints => {
  const meta = (property: string, attr: 'property' | 'name' = 'property') =>
    doc.querySelector<HTMLMetaElement>(`meta[${attr}="${property}"]`)?.content?.trim() || undefined;

  const jsonLd: unknown[] = [];
  for (const script of Array.from(doc.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'))) {
    try {
      jsonLd.push(JSON.parse(script.textContent ?? ''));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  }

  const firstImage =
    doc.querySelector<HTMLImageElement>('img[src]')?.currentSrc || doc.querySelector<HTMLImageElement>('img[src]')?.src;

  return {
    ogTitle: meta('og:title') ?? meta('twitter:title', 'name'),
    ogDescription: meta('og:description') ?? meta('description', 'name'),
    ogImage: meta('og:image') ?? meta('twitter:image', 'name'),
    h1: doc.querySelector('h1')?.textContent?.trim() || undefined,
    firstImage: firstImage || undefined,
    jsonLd: jsonLd.length > 0 ? jsonLd : undefined,
  };
};

/**
 * Pure function: resolve a favicon URL from the document.
 */
export const harvestFavicon = (doc: Document): string | undefined => {
  const link = doc.querySelector<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );
  return link?.href || undefined;
};
