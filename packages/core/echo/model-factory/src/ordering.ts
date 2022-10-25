//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { Timeframe } from '@dxos/timeframe';

import { ModelMessage } from './types';

/**
 * Ensures strong ordering of a mutation queue.
 * If appending a new mutation would break the strong order, it returns the proper index to insert the new mutation.
 * Otherwise it returns `exising.length`.
 */
export const getInsertionIndex = (existing: ModelMessage<Uint8Array>[], newMutation: ModelMessage<Uint8Array>) => {
  let start = existing.length - 1;
  for (const ourKey = PublicKey.from(newMutation.meta.feedKey); start >= 0; start--) {
    if (ourKey.equals(existing[start].meta.feedKey)) {
      break;
    }
  }
  for (let i = start + 1; i < existing.length; i++) {
    const existingTimeframe = Timeframe.merge(
      existing[i].meta.timeframe,
      new Timeframe([[PublicKey.from(existing[i].meta.feedKey), existing[i].meta.seq - 1]])
    );

    const deps = Timeframe.dependencies(newMutation.meta.timeframe, existingTimeframe);
    if (deps.isEmpty()) {
      if (PublicKey.from(newMutation.meta.feedKey).toHex() < PublicKey.from(existing[i].meta.feedKey).toHex()) {
        return i;
      }
    }
  }

  return existing.length;
};
