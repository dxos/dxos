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
