//
// Copyright 2026 DXOS.org
//

import { parse } from 'node-html-parser';

/** Tags whose content is noise for parser generation (scripts, styling, media chrome). */
const DROP_TAGS = [
  'script',
  'style',
  'noscript',
  'svg',
  'link',
  'meta',
  'iframe',
  'template',
  'head',
  'picture',
  'source',
  'canvas',
];

/** Attributes worth keeping for authoring selectors; everything else is dropped to cut noise. */
const KEEP_ATTRS = new Set([
  'id',
  'class',
  'href',
  'src',
  'alt',
  'title',
  'role',
  'name',
  'type',
  'value',
  'aria-label',
]);

const isStructuralAttr = (attr: string) => KEEP_ATTRS.has(attr) || attr.startsWith('data-');

export type CleanHtmlOptions = {
  /** Truncate the cleaned output to at most this many characters (keeps LLM input bounded). */
  maxLength?: number;
};

/**
 * Reduce a (possibly multi-MB, JS-rendered) HTML document to a compact, structure-only view
 * suitable for handing to an LLM to author a scrape template.
 *
 * Removes scripts/styles/media and noisy attributes (inline styles, event handlers, long
 * `data:`/`blob:` URLs), keeps structural attributes (`data-*`, `class`, `href`, `src`, aria, …),
 * collapses whitespace, and truncates. The engine feeds THIS to the LLM — not the raw page —
 * so the model can see the repeating listing structure within token limits.
 */
export const cleanHtml = (html: string, { maxLength = 64_000 }: CleanHtmlOptions = {}): string => {
  const root = parse(html, {
    comment: false,
    blockTextElements: { script: false, style: false, noscript: false, pre: false },
  });

  for (const tag of DROP_TAGS) {
    for (const element of root.querySelectorAll(tag)) {
      element.remove();
    }
  }

  for (const element of root.querySelectorAll('*')) {
    for (const attr of Object.keys(element.attributes)) {
      const value = element.getAttribute(attr) ?? '';
      const drop =
        !isStructuralAttr(attr) ||
        attr.startsWith('on') ||
        // Inline data/blob URIs (base64 images etc.) are huge and useless for selectors.
        ((attr === 'src' || attr === 'href') && /^(data:|blob:)/i.test(value));
      if (drop) {
        element.removeAttribute(attr);
      }
    }
  }

  const body = root.querySelector('body') ?? root;
  const cleaned = body
    .toString()
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
};
