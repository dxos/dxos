//
// Copyright 2026 DXOS.org
//

/** Format an ISO 8601 date string for tile/reader display. Returns undefined for missing/invalid input. */
export const formatDate = (iso: string | undefined): string | undefined => {
  if (!iso) {
    return undefined;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Sortable timestamp from an ISO date string (e.g. a Post's `published`); missing/unparseable
 * values sort last (newest-first sorts treat them as `-Infinity`).
 */
export const publishedTimestamp = (published: string | undefined): number => {
  if (!published) {
    return Number.NEGATIVE_INFINITY;
  }
  const ms = Date.parse(published);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
};
