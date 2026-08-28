//
// Copyright 2026 DXOS.org
//

/** One occurrence of the query, located well enough to scroll to and draw a box around. */
export type PdfMatch = {
  /** 1-based. */
  page: number;
  /** Index into the page's text items, which is also the index into the text layer's `textDivs`. */
  item: number;
  /** Character offset of the match within that item's string. */
  offset: number;
  length: number;
};

export type PdfPageText = {
  items: string[];
};

/** Rectangle of a match, in CSS pixels relative to the page's top-left corner. */
export type MatchRect = { left: number; top: number; width: number; height: number };

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
 * Where to draw a match, measured from the rendered text layer rather than computed from the PDF's
 * own transforms.
 *
 * A `Range` over the matched characters gives the browser's own layout of that substring — exact,
 * and correct for proportional fonts, ligatures and any transform the text layer applies. The
 * arithmetic alternative (apportioning a text item's width by character count) put boxes in
 * visibly wrong places on real documents.
 */
export const measureMatch = (span: HTMLElement, offset: number, length: number, page: HTMLElement): MatchRect[] => {
  const node = span.firstChild;
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return [];
  }

  const text = node.textContent ?? '';
  if (offset + length > text.length) {
    return [];
  }

  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset + length);
  const origin = page.getBoundingClientRect();

  return Array.from(range.getClientRects()).map((rect) => ({
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  }));
};
