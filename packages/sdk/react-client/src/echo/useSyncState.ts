//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PeerSyncState, type Space, type SpaceSyncStateMap } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { isEdgePeerId } from '@dxos/echo-protocol';

import { useClient } from '../client';

/**
 * Hook Subscribes to sync state for each space.
 */
export const useSyncState = (): SpaceSyncStateMap => {
  const client = useClient();
  const [spaceState, setSpaceState] = useState<SpaceSyncStateMap>({});

  useEffect(() => {
    const ctx = new Context();
    const createSubscriptions = (spaces: Space[]) => {
      for (const space of spaces) {
        if (spaceState[space.id]) {
          continue;
        }

        ctx.onDispose(
          space.internal.db.subscribeToAutomergeSyncState(ctx, ({ peers = [] }) => {
            const syncState = peers.find((state) => isEdgePeerId(state.peerId, space.id));
            if (syncState) {
              setSpaceState((spaceState) => ({ ...spaceState, [space.id]: syncState }));
            }
          }),
        );
      }
    };

    createSubscriptions(client.spaces.get());
    client.spaces.subscribe((spaces) => {
      createSubscriptions(spaces);
    });

    return () => {
      void ctx.dispose();
    };
  }, [client]);

  return spaceState;
};

/**
 * Hook Subscribes to sync state for a single space.
 */
// TODO(wittjosiah): Reconcile w/ useSyncState.
export const useSpaceSyncState = (space: Space): PeerSyncState | undefined => {
  const [spaceState, setSpaceState] = useState<PeerSyncState>();

  useEffect(() => {
    const ctx = new Context();
    space.internal.db.subscribeToAutomergeSyncState(ctx, ({ peers = [] }) => {
      const syncState = peers.find((state) => isEdgePeerId(state.peerId, space.id));
      if (syncState) {
        setSpaceState(syncState);
      }
    });

    return () => {
      void ctx.dispose();
    };
  }, [space]);

  return spaceState;
};
