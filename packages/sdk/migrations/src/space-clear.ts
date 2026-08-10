//
// Copyright 2026 DXOS.org
//

import { type Space, SpaceState } from '@dxos/client/echo';
import { invariant } from '@dxos/invariant';

import { MigrationBuilder } from './migration-builder';

export type ClearSpaceOptions = {
  /**
   * Object ids to retain. Everything else in the space is dropped.
   */
  keep: Iterable<string>;
};

export type ClearSpaceResult = {
  removed: string[];
  epochNumber: number;
};

/**
 * Drops every object in a space except the given ids, committing the result as a new epoch.
 *
 * This is a migration, not garbage collection: it destroys live objects on the caller's
 * instruction, whereas `space.internal.createEpoch()` only discards what was already deleted.
 * Both land as an epoch, so the retired documents are swept from disk the same way.
 *
 * Costs one read of the space root — the ids to drop are derived from its `links`/`objects` maps,
 * so clearing does not scan the space's contents.
 */
export const clearSpaceEpochMigration = async (
  space: Space,
  { keep }: ClearSpaceOptions,
): Promise<ClearSpaceResult> => {
  invariant(space.state.get() === SpaceState.SPACE_READY, 'Space must be open and ready before clearing.');

  const builder = new MigrationBuilder(space);
  const removed = builder.keepOnlyObjects(keep);
  await builder._commit();

  const epochs = await space.internal.getEpochs();
  const epochNumber = epochs[epochs.length - 1]?.subject.assertion.number ?? 0;

  return { removed, epochNumber };
};
