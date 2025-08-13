//
// Copyright 2025 DXOS.org
//

import { Console, Effect } from 'effect';

import { type Space, type SpaceId } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { EdgeService } from '@dxos/protocols';

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);

export const waitForSync = Effect.fn(function* (space: Space) {
  const ctx = new Context();
  const synced = yield* Effect.makeLatch();
  space.db.subscribeToSyncState(ctx, ({ peers = [] }) => {
    const syncState = peers.find((state) => isEdgePeerId(state.peerId, space.id));
    Effect.runSync(Console.log('syncing', syncState));

    if (
      syncState &&
      syncState.missingOnRemote === 0 &&
      syncState.missingOnLocal === 0 &&
      syncState.differentDocuments === 0
    ) {
      Effect.runSync(synced.open);
    }
  });
  yield* synced.await;
  ctx.dispose();
});
