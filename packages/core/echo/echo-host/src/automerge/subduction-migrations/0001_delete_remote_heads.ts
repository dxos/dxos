//
// Copyright 2026 DXOS.org
//

import { RuntimeProvider } from '@dxos/effect';
import { log } from '@dxos/log';

import { deleteSubductionRemoteHeads } from '../delete-subduction-remote-heads.ts';
import { type Migration } from './index.ts';

/**
 * Run once on every profile: deletes the stored remote-heads records, which a long-lived profile
 * collected one per document per edge restart, and vacuums the file so the space comes back. See
 * {@link deleteSubductionRemoteHeads} for why nothing is lost.
 */
export const deleteRemoteHeads: Migration = {
  name: '0001_delete_remote_heads',
  run: async ({ storage }) => {
    const { deleted, reclaimedBytes } = await RuntimeProvider.runPromise(storage.runtime)(
      deleteSubductionRemoteHeads(),
    );
    log.info('subduction remote heads deleted', { deleted, reclaimedBytes });
    return true;
  },
};
