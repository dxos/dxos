//
// Copyright 2026 DXOS.org
//

/** One occurrence of the query, located well enough to scroll to and highlight. */
export type PdfMatch = {
  /** 1-based. */
  page: number;
  /** Index into the page's text items, which is also the index into the text layer's spans. */
  item: number;
  /** Character offset of the match within that item's string. */
  offset: number;
  length: number;
};

export type PdfPageText = {
  items: string[];
};

/**
 * Every occurrence of `query`, case-insensitively.
 *
 * Matches are found per text item rather than across the page's concatenated text. A match spanning
 * two items is therefore missed — pdf.js splits items on font and positioning changes, so that
 * happens mid-word in justified text. Accepted deliberately: locating a cross-item match means
 * mapping an offset back through the join, and the failure mode here is a missed hit rather than a
 * highlight drawn in the wrong place.
 */
export const findMatches = (pages: PdfPageText[], query: string): PdfMatch[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [];
  }

  const matches: PdfMatch[] = [];
  pages.forEach((page, pageIndex) => {
    page.items.forEach((item, itemIndex) => {
      const haystack = item.toLowerCase();
      let offset = haystack.indexOf(needle);
      while (offset !== -1) {
        matches.push({ page: pageIndex + 1, item: itemIndex, offset, length: needle.length });
        offset = haystack.indexOf(needle, offset + needle.length);
      }
    });
  });
  return matches;
};

/**
 * Rewrites a text-layer span so its matched substrings sit inside `<mark>` elements.
 *
 * Highlighting in the DOM rather than as positioned overlays, because pdf.js gives each span an
 * `scaleX` transform that stretches it to the glyph widths the PDF specifies. Rectangles measured
 * with `Range.getClientRects()` do not map through that transform, so an overlay lands narrower
 * than the word and drifts left — visibly wrong on any proportional font. A `<mark>` inside the
 * span is laid out by the browser under the same transform, so it cannot disagree.
 */
export const markSpan = (
  span: HTMLElement,
  text: string,
  ranges: { offset: number; length: number; active: boolean }[],
): void => {
  if (ranges.length === 0) {
    // Only rewrite when the span actually carries markup; pdf.js reuses these nodes, and replacing
    // identical text on every keystroke would churn the whole layer.
    if (span.firstElementChild) {
      span.textContent = text;
    }
    return;
  }

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  for (const { offset, length, active } of [...ranges].sort((a, b) => a.offset - b.offset)) {
    if (offset > cursor) {
      fragment.append(text.slice(cursor, offset));
    }
    const mark = document.createElement('mark');
    mark.className = 'dx-pdf-highlight';
    mark.dataset.active = String(active);
    mark.textContent = text.slice(offset, offset + length);
    fragment.append(mark);
    cursor = offset + length;
  }
  if (cursor < text.length) {
    fragment.append(text.slice(cursor));
  }
  span.replaceChildren(fragment);
};
