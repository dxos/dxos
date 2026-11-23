//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Migration } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

export type CompactDocumentsOptions = {
  /**
   * Entity ids whose linked Automerge documents should be compacted.
   * Defaults to all ids in the space root `links` map.
   */
  objectIds?: readonly string[];
};

export type CompactDocumentsResult = {
  compacted: readonly string[];
  skipped: readonly string[];
  epochNumber: number;
};

/**
 * Re-materializes linked object documents into fresh Automerge docs (no history) and commits
 * a new space epoch with {@link SpacesService.Migration.enums.REPLACE_AUTOMERGE_ROOT}.
 */
export const compactDocumentsEpochMigration = async (
  space: Space,
  options: CompactDocumentsOptions = {},
): Promise<CompactDocumentsResult> => {
  invariant(space.state.get() === SpaceState.SPACE_READY, 'Space must be open and ready before compaction.');

  let result: Migration.CompactResult = { compacted: [], skipped: [] };
  await space.db.runMigrations([
    Migration.defineTransaction((transaction) =>
      Effect.sync(() => {
        result = transaction.compact(options.objectIds);
      }),
    ),
  ]);
  const { compacted, skipped } = result;

  const epochs = await space.internal.getEpochs();
  const lastEpoch = epochs[epochs.length - 1];
  const epochNumber = lastEpoch?.assertion.number ?? 0;

  return { compacted, skipped, epochNumber };
};
