//
// Copyright 2026 DXOS.org
//

import { parseBlockHeaders } from '@dxos/deus/parse';

/**
 * The block of `text` nearest `offset` that `has` accepts: the one the offset is in, else the closest by distance, the
 * earlier on a tie.
 */
export const nearestDefinition = (text: string, offset: number, has: (id: string) => boolean): string | undefined => {
  let nearest: { id: string; distance: number } | undefined;
  for (const { id, from, to } of parseBlockHeaders(text)) {
    if (!has(id)) {
      continue;
    }
    const distance = offset < from ? from - offset : offset > to ? offset - to : 0;
    if (nearest === undefined || distance < nearest.distance) {
      nearest = { id, distance };
    }
  }
  return nearest?.id;
};
