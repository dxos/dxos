//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';
import { SyncBinding } from '@dxos/plugin-connector';

/**
 * Drops items already reflected by the cursor. An item is skipped when its provider key is below the
 * run's high-water cursor (`key < cursorKey`) or its foreign id is already committed (`dedupSet`).
 * Reusable across providers via the `getForeignId` / `getKey` accessors; reads the cursor state from
 * the {@link SyncBinding.Service} in the Requirements channel. Emits `undefined` to drop.
 */
export const makeDedupStage = <In>(
  id: string,
  getForeignId: (item: In) => string,
  getKey: (item: In) => number,
): Stage.Stage<In, In, never, SyncBinding.Service> =>
  Stage.map(id, (item: In) =>
    Effect.gen(function* () {
      const { cursorKey, dedupSet } = yield* SyncBinding.Service;
      if (getKey(item) < cursorKey || dedupSet.has(getForeignId(item))) {
        return undefined;
      }
      return item;
    }),
  );
