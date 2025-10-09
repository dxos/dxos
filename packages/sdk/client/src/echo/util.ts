//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { type Space } from '@dxos/client-protocol';
import { Obj, type Type } from '@dxos/echo';
import { type AnyLiveObject, type SpaceSyncState, getDatabaseFromObject } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type Live, isLiveObject } from '@dxos/live-object';

import { SpaceProxy } from './space-proxy';

// TODO(dmaretskyi): Move to @dxos/echo/internal.
export const ReactiveObjectSchema: Schema.Schema<Live<any>> = Schema.Any.pipe(
  Schema.filter((obj) => isLiveObject(obj)),
  Schema.annotations({ title: 'Live' }),
);

export const EchoObjectSchema: Schema.Schema<AnyLiveObject<any>> = Schema.Any.pipe(
  Schema.filter((obj) => Obj.isObject(obj)),
  Schema.annotations({ title: 'EchoObject' }),
);

/**
 * @param object @deprecated
 */
// TODO(wittjosiah): This should be `Obj.getSpace` / `Relation.getSpace` / `Ref.getSpace`.
export const getSpace = (object?: Live<any>): Space | undefined => {
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

/**
 * Fully qualified id of a reactive object is a combination of the space id and the object id.
 * @returns Fully qualified id of a reactive object.
 * @deprecated Prefer DXNs.
 */
export const fullyQualifiedId = (object: Live<any>): string => {
  const space = getSpace(object);
  return space ? `${space.id}:${object.id}` : object.id;
};

/**
 * @deprecated Use `parseId` instead.
 */
export const parseFullyQualifiedId = (id: string): [string, string] => {
  const [spaceId, objectId] = id.split(':');
  invariant(objectId, 'invalid id');
  return [spaceId, objectId];
};

// TODO(burdon): Don't export.
export const SPACE_ID_LENGTH = 33;
export const OBJECT_ID_LENGTH = 26;
export const FQ_ID_LENGTH = SPACE_ID_LENGTH + OBJECT_ID_LENGTH + 1;

// TODO(burdon): Move to @dxos/keys.
export const parseId = (id?: string): { spaceId?: Type.SpaceId; objectId?: Type.ObjectId } => {
  if (!id) {
    return {};
  } else if (id.length === SPACE_ID_LENGTH) {
    return {
      spaceId: id as Type.SpaceId,
    };
  } else if (id.length === OBJECT_ID_LENGTH) {
    return {
      objectId: id as Type.ObjectId,
    };
  } else if (id.length === FQ_ID_LENGTH && id.indexOf(':') === SPACE_ID_LENGTH) {
    const [spaceId, objectId] = id.split(':');
    return {
      spaceId: spaceId as Type.SpaceId,
      objectId: objectId as Type.ObjectId,
    };
  } else {
    return {};
  }
};

//
// EDGE Sync State
//

export type Progress = { count: number; total: number };

export type PeerSyncState = Omit<SpaceSyncState.PeerState, 'peerId'>;

export type SpaceSyncStateMap = Record<Type.SpaceId, PeerSyncState>;

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
