//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Scope from 'effect/Scope';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { type Space, type PeerSyncState } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { isEdgePeerId } from '@dxos/echo-protocol';
import { type SpaceId } from '@dxos/keys';

import { ClientCapabilities } from '#types';

import {
  ProgressMonitorBridge,
  createSpaceReplicationProgressKey,
  getSpaceProgressLabel,
} from '../progress';

/**
 * Publishes per-space automerge replication backlog into {@link AppCapabilities.ProgressRegistry}.
 * Subscribes via the client sync-state stream and removes monitors when a space catches up.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const scope = yield* Scope.Scope;
    const client = yield* Capability.get(ClientCapabilities.Client);
    const registries = yield* Capability.getAll(AppCapabilities.ProgressRegistry);
    if (registries.length === 0) {
      return;
    }

    const bridge = new ProgressMonitorBridge(registries);
    const syncContext = new Context();
    const subscribedSpaces = new Set<SpaceId>();

    yield* Scope.addFinalizer(
      scope,
      Effect.sync(() => {
        void syncContext.dispose();
        bridge.clear();
        subscribedSpaces.clear();
      }),
    );

    const applyPeerState = (space: Space, peerState: PeerSyncState): void => {
      const key = createSpaceReplicationProgressKey(space.id);
      const unsynced = peerState.unsyncedDocumentCount ?? 0;
      if (unsynced === 0) {
        bridge.remove(key);
        return;
      }

      const total = peerState.totalDocumentCount ?? 0;
      const current = total > 0 ? Math.max(0, total - unsynced) : 0;
      const note =
        peerState.missingOnLocal > 0 || peerState.missingOnRemote > 0
          ? `↓${peerState.missingOnLocal} ↑${peerState.missingOnRemote}`
          : undefined;

      bridge.update(key, {
        label: getSpaceProgressLabel(space),
        current,
        total: total > 0 ? total : unsynced,
        note,
      });
    };

    const subscribeSpace = (space: Space): void => {
      if (subscribedSpaces.has(space.id)) {
        return;
      }
      subscribedSpaces.add(space.id);

      syncContext.onDispose(
        space.internal.db.subscribeToSyncState(syncContext, ({ peers = [] }) => {
          const edgePeer = peers.find((state) => isEdgePeerId(state.peerId, space.id));
          if (edgePeer) {
            applyPeerState(space, edgePeer);
          }
        }),
      );
    };

    for (const space of client.spaces.get()) {
      subscribeSpace(space);
    }

    const spacesSubscription = client.spaces.subscribe((spaces) => {
      for (const space of spaces) {
        subscribeSpace(space);
      }
    });

    yield* Scope.addFinalizer(scope, Effect.sync(() => spacesSubscription.unsubscribe()));
  }),
);
