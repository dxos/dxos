//
// Copyright 2025 DXOS.org
//

import { fromUrlPath, toUrlPath } from '@dxos/app-toolkit';

const PLANK_PARAM = 'plank';

/**
 * Serialize deck active qualified IDs into a URL search string.
 * Preserves non-plank query params from the existing search string.
 */
export const serializePlanks = (active: readonly string[], existingSearch: string): string => {
  const params = new URLSearchParams(existingSearch);
  params.delete(PLANK_PARAM);
  for (const id of active) {
    params.append(PLANK_PARAM, toUrlPath(id));
  }
  return params.size > 0 ? `?${params.toString()}` : '';
};

/**
 * Deserialize plank query params from a URL back to qualified graph IDs.
 */
export const deserializePlanks = (url: URL): string[] => {
  return url.searchParams.getAll(PLANK_PARAM).map(fromUrlPath);
};

/**
 * Strip plank query params from a search string, preserving all others.
 */
export const stripPlanks = (existingSearch: string): string => {
  const params = new URLSearchParams(existingSearch);
  params.delete(PLANK_PARAM);
  return params.size > 0 ? `?${params.toString()}` : '';
};
