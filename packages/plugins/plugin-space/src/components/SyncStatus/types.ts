//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Space, type SpaceId, type SpaceSyncState } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { EdgeService } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';

export type Progress = { count: number; total: number };

export type PeerSyncState = Omit<SpaceSyncState.PeerState, 'peerId'>;

export type SpaceSyncStateMap = Record<SpaceId, PeerSyncState>;

export const createEmptyEdgeSyncState = (): PeerSyncState => ({
  missingOnLocal: 0,
  missingOnRemote: 0,
  localDocumentCount: 0,
  remoteDocumentCount: 0,
  differentDocuments: 0,
});

export const getSyncSummary = (syncMap: SpaceSyncStateMap): PeerSyncState => {
  return Object.entries(syncMap).reduce<PeerSyncState>((summary, [_spaceId, peerState]) => {
    summary.missingOnLocal += peerState.missingOnLocal;
    summary.missingOnRemote += peerState.missingOnRemote;
    summary.localDocumentCount += peerState.localDocumentCount;
    summary.remoteDocumentCount += peerState.remoteDocumentCount;
    summary.differentDocuments += peerState.differentDocuments;
    return summary;
  }, createEmptyEdgeSyncState());
};

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);

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
          space.crud.subscribeToSyncState(ctx, ({ peers = [] }) => {
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
