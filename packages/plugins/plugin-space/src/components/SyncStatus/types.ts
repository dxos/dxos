//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { type Space, type SpaceId, type SpaceSyncState } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { EdgeService } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';

export type Progress = { count: number; total: number };

type PeerSyncState = Omit<SpaceSyncState.PeerState, 'peerId'>;

export type SpaceSyncStateMap = Record<SpaceId, PeerSyncState>;

export type SyncStateSummary = PeerSyncState & {
  totalDocumentCount: number;
};

export const createEmptyEdgeSyncState = (): SyncStateSummary => ({
  missingOnLocal: 0,
  missingOnRemote: 0,
  localDocumentCount: 0,
  remoteDocumentCount: 0,
  differentDocuments: 0,
  totalDocumentCount: 0,
});

export const getSyncSummary = (syncMap: SpaceSyncStateMap): SyncStateSummary => {
  return Object.entries(syncMap).reduce<SyncStateSummary>((summary, [_spaceId, peerState]) => {
    summary.missingOnRemote += peerState.missingOnRemote;
    summary.missingOnLocal += peerState.missingOnLocal;
    summary.differentDocuments += peerState.differentDocuments;
    summary.localDocumentCount += peerState.localDocumentCount;
    summary.remoteDocumentCount += peerState.remoteDocumentCount;
    summary.totalDocumentCount += Math.max(peerState.localDocumentCount, peerState.remoteDocumentCount);

    // if (peerState.missingOnRemote > 0 || peerState.missingOnLocal > 0 || peerState.differentDocuments > 0) {
    //   state.unsyncedSpaces.add(spaceId as SpaceId);
    // }

    // if (!hasEdgePeer) {
    //   state.spacesNotConnectedToEdge.add(spaceId as SpaceId);
    // }

    return summary;
  }, createEmptyEdgeSyncState());
};

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
            // TODO(burdon): Get info from other peers.
            setSpaceState((spaceState) => ({ ...spaceState, [space.id]: syncState ?? {} }));
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

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);
