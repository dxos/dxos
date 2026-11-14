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
  for (const { id, from, to, body } of parseBlockHeaders(text)) {
    if (!has(id)) {
      continue;
    }
    // `from` and `to` bound the opening fence line; the block runs on through its body.
    const end = to + 1 + body.length;
    const distance = offset < from ? from - offset : offset > end ? offset - end : 0;
    if (nearest === undefined || distance < nearest.distance) {
      nearest = { id, distance };
    }
  }
  return nearest?.id;
};
