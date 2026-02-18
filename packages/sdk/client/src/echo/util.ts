//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client-protocol';
import { getDatabaseFromObject } from '@dxos/echo-db';
import { type ObjectId, type SpaceId } from '@dxos/keys';
import { type SpaceSyncState_PeerState } from '@dxos/protocols/buf/dxos/echo/service_pb';

import { SpaceProxy } from './space-proxy';

/**
 * @param object @deprecated
 */
// TODO(wittjosiah): This should be `Obj.getSpace` / `Relation.getSpace` / `Ref.getSpace`.
export const getSpace = (object?: any): Space | undefined => {
  if (!object) {
    return undefined;
  }

  const db = getDatabaseFromObject(object);
  const id = db?.spaceId;
  if (id) {
    const owner = db.graph._getOwningObject(id);
    if (owner instanceof SpaceProxy) {
      return owner;
    }
  }

  return undefined;
};

// TODO(burdon): Don't export.
export const SPACE_ID_LENGTH = 33;
export const OBJECT_ID_LENGTH = 26;
export const FQ_ID_LENGTH = SPACE_ID_LENGTH + OBJECT_ID_LENGTH + 1;

export const parseId = (id?: string): { spaceId?: SpaceId; objectId?: ObjectId } => {
  if (!id) {
    return {};
  } else if (id.length === SPACE_ID_LENGTH) {
    return {
      spaceId: id as SpaceId,
    };
  } else if (id.length === OBJECT_ID_LENGTH) {
    return {
      objectId: id as ObjectId,
    };
  } else if (id.length === FQ_ID_LENGTH && id.indexOf(':') === SPACE_ID_LENGTH) {
    const [spaceId, objectId] = id.split(':');
    return {
      spaceId: spaceId as SpaceId,
      objectId: objectId as ObjectId,
    };
  } else {
    return {};
  }
};

//
// EDGE Sync State
//

export type Progress = { count: number; total: number };

export type PeerSyncState = Omit<SpaceSyncState_PeerState, 'peerId' | '$typeName' | '$unknown'>;

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
