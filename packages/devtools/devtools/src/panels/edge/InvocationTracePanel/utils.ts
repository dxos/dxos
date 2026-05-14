//
// Copyright 2025 DXOS.org
//

import { type URI } from '@dxos/keys';

export const formatDuration = (duration: number): string => {
  return `${(duration / 1000).toFixed(2)}`;
};

/**
 * Extracts the trailing UUID segment from a function-target DXN (`dxn:<nsid>:<uuid>`).
 * Returns undefined if the URI is missing.
 */
export const getUuidFromDxn = (uri: URI.URI | undefined): string | undefined => {
  if (!uri) {
    return undefined;
  }

  const parts = uri.split(':');
  return parts.at(-1);
};
