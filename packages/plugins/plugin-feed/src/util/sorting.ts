//
// Copyright 2026 DXOS.org
//

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
