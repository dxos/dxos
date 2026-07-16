//
// Copyright 2024 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';

import type { CollectionId } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

export const deriveCollectionIdFromSpaceId = (spaceId: SpaceId, rootDocumentId?: DocumentId): CollectionId =>
  (rootDocumentId ? `space:${spaceId}:${rootDocumentId}` : `space:${spaceId}`) as CollectionId;

/**
 * Non-throwing variant of {@link getSpaceIdFromCollectionId}: returns the owning space id for a
 * space collection id (`space:<spaceId>[:<root>]`), or null for any collection id that does not
 * embed a valid space id. Used on the share-policy path, where the parse must not throw.
 */
export const tryGetSpaceIdFromCollectionId = (collectionId: string): SpaceId | null => {
  const spaceId = collectionId.split(':')[1];
  return SpaceId.isValid(spaceId) ? spaceId : null;
};

export const getSpaceIdFromCollectionId = (collectionId: CollectionId): SpaceId => {
  const spaceId = tryGetSpaceIdFromCollectionId(collectionId);
  invariant(spaceId);
  return spaceId;
};
