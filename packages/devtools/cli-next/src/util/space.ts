//
// Copyright 2025 DXOS.org
//

import { Console, Effect } from 'effect';

import { type Space, type SpaceId } from '@dxos/client/echo';
import { contextFromScope } from '@dxos/effect';
import { EdgeService } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);

// TODO(wittjosiah): This is not yet foolproof.
export const waitForSync = Effect.fn(function* (space: Space) {
  if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
    yield* Effect.log('Edge replication is disabled, enabling...');
    yield* Effect.tryPromise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  }

  const ctx = yield* contextFromScope();
  const synced = yield* Effect.makeLatch();
  space.db.subscribeToSyncState(ctx, ({ peers = [] }) => {
    const syncState = peers.find((state) => isEdgePeerId(state.peerId, space.id));
    Effect.runSync(Effect.log('syncing', syncState));

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
});
