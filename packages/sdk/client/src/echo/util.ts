//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client-protocol';
import { Obj } from '@dxos/echo';
import { type SpaceSyncState } from '@dxos/echo-db';
import { type SpaceId } from '@dxos/keys';

import { SpaceProxy } from './space-proxy';

/**
 * Returns the {@link Space} that owns the given object, or `undefined`.
 *
 * Use {@link Obj.getDatabase} when you only need DB/`spaceId` access; this
 * helper is retained only for callers that need {@link Space} proxy members
 * (`properties`, `queues`, `members`, `key`, `state`, `listen`, identity).
 */
// TODO(burdon): Hypergraph.getSpace().
export const getSpace = (object?: any): Space | undefined => {
  if (!object) {
    return undefined;
  }

  const db = Obj.getDatabase(object);
  const id = db?.spaceId;
  if (id && '_getOwningObject' in db.graph) {
    const owner = (db.graph as { _getOwningObject: (id: SpaceId) => unknown })._getOwningObject(id);
    if (owner instanceof SpaceProxy) {
      return owner;
    }
  }

  return undefined;
};

//
// EDGE Sync State
//

export type Progress = { count: number; total: number };

export type PeerSyncState = Omit<SpaceSyncState.PeerState, 'peerId'>;

export type SpaceSyncStateMap = Record<SpaceId, PeerSyncState>;

export const createEmptyEdgeSyncState = (): PeerSyncState => ({
  missingOnLocal: 0,
  missingOnRemote: 0,
  localDocumentCount: 0,
  remoteDocumentCount: 0,
  differentDocuments: 0,
  totalDocumentCount: 0,
  unsyncedDocumentCount: 0,
});

export const getSyncSummary = (syncMap: SpaceSyncStateMap): PeerSyncState => {
  return Object.entries(syncMap).reduce<PeerSyncState>((summary, [_spaceId, peerState]) => {
    summary.missingOnLocal += peerState.missingOnLocal;
    summary.missingOnRemote += peerState.missingOnRemote;
    summary.localDocumentCount += peerState.localDocumentCount;
    summary.remoteDocumentCount += peerState.remoteDocumentCount;
    summary.differentDocuments += peerState.differentDocuments;
    summary.totalDocumentCount += peerState.totalDocumentCount;
    summary.unsyncedDocumentCount += peerState.unsyncedDocumentCount;
    return summary;
  }, createEmptyEdgeSyncState());
};
