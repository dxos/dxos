//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client-protocol';
import { type SpaceSyncState, type ReactiveEchoObject, getDatabaseFromObject, isEchoObject } from '@dxos/echo-db';
import { ObjectId, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { DXN, QueueSubspaceTags, SpaceId } from '@dxos/keys';
import { isLiveObject, type Live } from '@dxos/live-object';

import { SpaceProxy } from './space-proxy';

// TODO(burdon): Move to @dxos/keys.
export const SPACE_ID_LENGTH = 33;
export const OBJECT_ID_LENGTH = 26;
export const FQ_ID_LENGTH = SPACE_ID_LENGTH + OBJECT_ID_LENGTH + 1;

export const isSpace = (object: unknown): object is Space => object instanceof SpaceProxy;

export const SpaceSchema: S.Schema<Space> = S.Any.pipe(
  S.filter((x) => isSpace(x)),
  S.annotations({ title: 'Space' }),
);

// TODO(dmaretskyi): Move to @dxos/echo-schema.
export const ReactiveObjectSchema: S.Schema<Live<any>> = S.Any.pipe(
  S.filter((x) => isLiveObject(x)),
  S.annotations({ title: 'Live' }),
);
export const EchoObjectSchema: S.Schema<ReactiveEchoObject<any>> = S.Any.pipe(
  S.filter((x) => isEchoObject(x)),
  S.annotations({ title: 'EchoObject' }),
);

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

export const parseId = (id?: string): { spaceId?: SpaceId; objectId?: ObjectId } => {
  if (!id) {
    return {};
  } else if (id.length === SPACE_ID_LENGTH) {
    return { spaceId: id as SpaceId };
  } else if (id.length === OBJECT_ID_LENGTH) {
    return { objectId: id as ObjectId };
  } else if (id.length === FQ_ID_LENGTH && id.indexOf(':') === SPACE_ID_LENGTH) {
    const [spaceId, objectId] = id.split(':');
    return { spaceId: spaceId as SpaceId, objectId: objectId as ObjectId };
  } else {
    return {};
  }
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

// TODO(burdon): Move to @dxos/keys once ObjectId is moved there.
export const createQueueDxn = (spaceId = SpaceId.random(), queueId = ObjectId.random()) =>
  new DXN(DXN.kind.QUEUE, [QueueSubspaceTags.DATA, spaceId, queueId]);
