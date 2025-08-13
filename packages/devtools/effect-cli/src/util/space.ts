//
// Copyright 2025 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type Space, type SpaceId } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { EdgeService } from '@dxos/protocols';

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);

export const waitForSync = async (space: Space) => {
  const ctx = new Context();
  const synced = new Trigger();
  space.db.subscribeToSyncState(ctx, ({ peers = [] }) => {
    const syncState = peers.find((state) => isEdgePeerId(state.peerId, space.id));
    if (
      syncState &&
      syncState.missingOnRemote === 0 &&
      syncState.missingOnLocal === 0 &&
      syncState.differentDocuments === 0
    ) {
      synced.wake();
    } else {
      log.info('syncing', { syncState });
    }
  });
  await synced.wait();
  ctx.dispose();
};
