//
// Copyright 2025 DXOS.org
//

import { Effect, Logger } from 'effect';

import { type Space, type SpaceId, type SpaceSyncState } from '@dxos/client/echo';
import { contextFromScope } from '@dxos/effect';
import { EdgeService } from '@dxos/protocols';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);

export const waitForSync = Effect.fn(function* (space: Space) {
  if (space.internal.data.edgeReplication !== EdgeReplicationSetting.ENABLED) {
    yield* Effect.log('Edge replication is disabled, enabling...');
    yield* Effect.tryPromise(() => space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED));
  }

  const ctx = yield* contextFromScope();
  const synced = yield* Effect.makeLatch();
  const handleSyncState = ({ peers = [] }: SpaceSyncState) =>
    Effect.gen(function* () {
      const syncState = peers.find((state) => isEdgePeerId(state.peerId, space.id));
      yield* Effect.log('syncing', syncState);

      if (
        syncState &&
        syncState.missingOnRemote === 0 &&
        syncState.missingOnLocal === 0 &&
        syncState.differentDocuments === 0
      ) {
        yield* synced.open;
      }
    }).pipe(Effect.provide(Logger.pretty));

  space.db.subscribeToSyncState(ctx, (syncState) => Effect.runSync(handleSyncState(syncState)));
  // TODO(wittjosiah): This is not yet foolproof. Needs to wait for connection to edge to be established.
  const syncState = yield* Effect.tryPromise(() => space.db.getSyncState());
  yield* handleSyncState(syncState);
  yield* synced.await;
});
