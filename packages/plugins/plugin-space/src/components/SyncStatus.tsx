//
// Copyright 2024 DXOS.org
//

import { CloudArrowDown, CloudArrowUp, CloudCheck, CloudSlash } from '@phosphor-icons/react';
import React, { useEffect } from 'react';

import type { UnsubscribeCallback } from '@dxos/async';
import type { Client } from '@dxos/client';
import { type Space, type SpaceId, type SpaceSyncState } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { StatusBar } from '@dxos/plugin-status-bar';
import { EdgeService } from '@dxos/protocols';
import { useClient } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui-theme';

export const SyncStatus = () => {
  const client = useClient();
  const [state, setState] = React.useState<EdgeSyncState>(initialEdgeSyncState);

  useEffect(() => {
    return createClientSyncTracker(client, (state) => {
      setState(state);
    });
  }, []);

  const needsToUpload = state.missingOnRemote > 0 || state.differentDocuments > 0;
  const needsToDownload = state.missingOnLocal > 0 || state.differentDocuments > 0;
  const notConnectedToEdge = state.spacesNotConnectedToEdge.size > 0;

  return (
    <StatusBar.Item title={JSON.stringify(state, null, 2)}>
      {notConnectedToEdge ? (
        <CloudSlash className={getSize(4)} />
      ) : needsToUpload ? (
        <CloudArrowUp className={getSize(4)} />
      ) : needsToDownload ? (
        <CloudArrowDown className={getSize(4)} />
      ) : (
        <CloudCheck className={getSize(4)} />
      )}
    </StatusBar.Item>
  );
};

const createClientSyncTracker = (client: Client, cb: (state: EdgeSyncState) => void) => {
  const unsubscribeCallbacks: Record<SpaceId, UnsubscribeCallback> = {};
  const state: Record<SpaceId, SpaceSyncState> = {};

  const install = (spaces: Space[]) => {
    for (const space of spaces) {
      if (state[space.id]) {
        continue;
      }

      unsubscribeCallbacks[space.id] = space.crud.subscribeToSyncState(Context.default(), (syncState) => {
        state[space.id] = syncState;
        cb(extractEdgeSyncSate(state));
      });
    }
  };
  client.spaces.subscribe((spaces) => {
    install(spaces);
  });
  install(client.spaces.get());

  return () => {
    for (const unsubscribe of Object.values(unsubscribeCallbacks)) {
      unsubscribe();
    }
  };
};

type EdgeSyncState = {
  unsyncedSpaces: Set<SpaceId>;
  spacesNotConnectedToEdge: Set<SpaceId>;
  missingOnRemote: number;
  missingOnLocal: number;
  differentDocuments: number;
  localDocumentCount: number;
  remoteDocumentCount: number;
};

const initialEdgeSyncState: EdgeSyncState = {
  unsyncedSpaces: new Set(),
  spacesNotConnectedToEdge: new Set(),
  missingOnRemote: 0,
  missingOnLocal: 0,
  differentDocuments: 0,
  localDocumentCount: 0,
  remoteDocumentCount: 0,
};

const extractEdgeSyncSate = (state: Record<SpaceId, SpaceSyncState>): EdgeSyncState => {
  const unsyncedSpaces = new Set<SpaceId>();
  const spacesNotConnectedToEdge = new Set<SpaceId>();
  let missingOnRemote = 0;
  let missingOnLocal = 0;
  let differentDocuments = 0;
  let localDocumentCount = 0;
  let remoteDocumentCount = 0;

  for (const [spaceId, syncState] of Object.entries(state)) {
    let hasEdgePeer = false;
    for (const peerState of syncState.peers ?? []) {
      if (isEdgePeerId(peerState.peerId, spaceId as SpaceId)) {
        hasEdgePeer = true;
        missingOnRemote += peerState.missingOnRemote;
        missingOnLocal += peerState.missingOnLocal;
        differentDocuments += peerState.differentDocuments;
        localDocumentCount += peerState.localDocumentCount;
        remoteDocumentCount += peerState.remoteDocumentCount;
        if (peerState.missingOnRemote > 0 || peerState.missingOnLocal > 0 || peerState.differentDocuments > 0) {
          unsyncedSpaces.add(spaceId as SpaceId);
        }
        break;
      }
    }
    if (!hasEdgePeer) {
      spacesNotConnectedToEdge.add(spaceId as SpaceId);
    }
  }

  return {
    unsyncedSpaces,
    spacesNotConnectedToEdge,
    missingOnRemote,
    missingOnLocal,
    differentDocuments,
    localDocumentCount,
    remoteDocumentCount,
  };
};

const isEdgePeerId = (peerId: string, spaceId: SpaceId) =>
  peerId.startsWith(`${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`);
