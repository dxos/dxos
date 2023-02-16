//
// Copyright 2022 DXOS.org
//

import { Any } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/keys';
import { ModelMessage } from '@dxos/model-factory';
import { MutationMeta } from '@dxos/protocols/src/proto/gen/dxos/echo/object';
import { Timeframe } from '@dxos/timeframe';

export type MutationInQueue<T> = {
  /**
   * Decoded mutation for the model.
   */
  mutation: T;
  meta: MutationMeta
};

/**
 * Ensures strong ordering of a mutation queue.
 * If appending a new mutation would break the strong order, it returns the proper index to insert the new mutation.
 * Otherwise it returns `exising.length`.
 */
export const getInsertionIndex = (existing: MutationInQueue<any>[], newMutation: MutationInQueue<any>) => {
  let start = existing.length - 1;
  for (const ourKey = PublicKey.from(newMutation.meta.feedKey!); start >= 0; start--) {
    if (ourKey.equals(existing[start].meta.feedKey!)) {
      break;
    }
  }
  for (let i = start + 1; i < existing.length; i++) {
    const existingTimeframe = Timeframe.merge(
      existing[i].meta.timeframe!,
      new Timeframe([[PublicKey.from(existing[i].meta.feedKey!), existing[i].meta.seq! - 1]])
    );

    const deps = Timeframe.dependencies(newMutation.meta.timeframe!, existingTimeframe);
    if (deps.isEmpty()) {
      if (PublicKey.from(newMutation.meta.feedKey!).toHex() < PublicKey.from(existing[i].meta.feedKey!).toHex()) {
        return i;
      }
    }
  }

  return existing.length;
};
