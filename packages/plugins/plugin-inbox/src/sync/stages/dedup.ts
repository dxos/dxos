//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Stage } from '@dxos/pipeline';

/** Context a dedup stage reads (a structural subset of the full pipeline context). */
export type DedupContext = {
  /** High-water cursor key at run start; items with a lower key are already committed. */
  readonly cursorKey: number;
  /** Foreign ids already committed. */
  readonly dedupSet: ReadonlySet<string>;
};

/**
 * Drops items already reflected by the cursor. An item is skipped when its provider key is below the
 * run's high-water cursor (`key < cursorKey`) or its foreign id is already committed (`dedupSet`).
 * Reusable across providers via the `getForeignId` / `getKey` accessors. Emits `undefined` to drop —
 * the pipeline filters those before the next stage.
 */
export const makeDedupStage = <In>(
  id: string,
  getForeignId: (item: In) => string,
  getKey: (item: In) => number,
): Stage.Stage<In, In | undefined, DedupContext, never> =>
  Stage.map(id, (item, ctx) =>
    Effect.sync(() => {
      if (getKey(item) < ctx.cursorKey || ctx.dedupSet.has(getForeignId(item))) {
        return undefined;
      }
      return item;
    }),
  );
