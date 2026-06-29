//
// Copyright 2026 DXOS.org
//

import { SpaceState } from '@dxos/client/echo';
import {
  type CompactDocumentsOptions,
  type CompactDocumentsResult,
  compactDocumentsEpochMigration,
} from '@dxos/migrations';

import { getRecoveryClient } from './boot-client';

export type RecoveryCompactDocumentsOptions = CompactDocumentsOptions & {
  /** Defaults to the first space in the profile. */
  spaceId?: string;
};

/**
 * Open a space (if needed) and run document compaction epoch migration.
 */
export const compactDocumentsInRecovery = async (
  options: RecoveryCompactDocumentsOptions = {},
): Promise<CompactDocumentsResult & { spaceId: string }> => {
  const client = getRecoveryClient();
  if (!client) {
    throw new Error('Boot recovery client first.');
  }

  const spaces = client.spaces.get();
  const space = options.spaceId ? spaces.find((candidate) => candidate.id === options.spaceId) : spaces[0];
  if (!space) {
    throw new Error(options.spaceId ? `Space not found: ${options.spaceId}` : 'No spaces in profile.');
  }

  if (space.state.get() !== SpaceState.SPACE_READY) {
    await space.open();
    await space.waitUntilReady();
  }

  const result = await compactDocumentsEpochMigration(space, { objectIds: options.objectIds });
  return { ...result, spaceId: space.id };
};
