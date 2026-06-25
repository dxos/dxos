//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

const PLANK_PARAM = 'plank';

/**
 * Serialize deck active qualified IDs into a URL search string.
 * Preserves non-plank query params from the existing search string.
 */
export const serializePlanks = (active: readonly string[], existingSearch: string): string => {
  const params = new URLSearchParams(existingSearch);
  params.delete(PLANK_PARAM);
  for (const id of active) {
    params.append(PLANK_PARAM, Paths.toUrlPath(id));
  }
  return params.size > 0 ? `?${params.toString()}` : '';
};

/**
 * Deserialize plank query params from a URL back to qualified graph IDs.
 * Duplicates are dropped (preserving first occurrence): a shared or hand-edited URL may repeat a
 * `plank` param, and the deck's `active` list must stay unique so each plank renders under a distinct key.
 */
export const deserializePlanks = (url: URL): string[] => {
  return Array.from(new Set(url.searchParams.getAll(PLANK_PARAM).map(Paths.fromUrlPath)));
};

/**
 * Strip plank query params from a search string, preserving all others.
 */
export const stripPlanks = (existingSearch: string): string => {
  const params = new URLSearchParams(existingSearch);
  params.delete(PLANK_PARAM);
  return params.size > 0 ? `?${params.toString()}` : '';
};
