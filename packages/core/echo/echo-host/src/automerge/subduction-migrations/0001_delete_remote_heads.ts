//
// Copyright 2026 DXOS.org
//

import { RuntimeProvider } from '@dxos/effect';

import { deleteSubductionRemoteHeads } from '../delete-subduction-remote-heads.ts';
import { type SubductionMigration } from './index.ts';

/**
 * The repair behind the recovery page's Repair button, run once on every profile: deletes the
 * stored remote-heads records, which a long-lived profile collected one per document per edge
 * restart, and vacuums the file so the space comes back. See {@link deleteSubductionRemoteHeads}
 * for why nothing is lost.
 */
export const deleteRemoteHeads: SubductionMigration = {
  name: '0001_delete_remote_heads',
  run: async ({ runtime }) => {
    const { deleted, reclaimedBytes } = await RuntimeProvider.runPromise(runtime)(deleteSubductionRemoteHeads());
    return { complete: true, counts: { deleted, reclaimedBytes } };
  },
};
