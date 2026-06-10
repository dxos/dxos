//
// Copyright 2026 DXOS.org
//

import { type Space, SpaceState } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { MigrationBuilder } from './migration-builder';

export type CompactDocumentsOptions = {
  /**
   * Entity ids whose linked Automerge documents should be compacted.
   * Defaults to all ids in the space root `links` map.
   */
  objectIds?: string[];
};

export type CompactDocumentsResult = {
  compacted: string[];
  skipped: string[];
  epochNumber: number;
};

/**
 * Re-materializes linked object documents into fresh Automerge docs (no history) and commits
 * a new space epoch with {@link CreateEpochRequest.Migration.REPLACE_AUTOMERGE_ROOT}.
 */
export const compactDocumentsEpochMigration = async (
  space: Space,
  options: CompactDocumentsOptions = {},
): Promise<CompactDocumentsResult> => {
  invariant(space.state.get() === SpaceState.SPACE_READY, 'Space must be open and ready before compaction.');

  const builder = new MigrationBuilder(space);
  const { compacted, skipped } = await builder.compactLinkedDocuments(options.objectIds);
  await builder._commit();

  const epochs = await space.internal.getEpochs();
  const lastEpoch = epochs[epochs.length - 1];
  const epochNumber = lastEpoch?.subject.assertion.number ?? 0;

  return { compacted, skipped, epochNumber };
};
