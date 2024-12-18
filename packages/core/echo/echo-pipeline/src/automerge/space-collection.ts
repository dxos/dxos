//
// Copyright 2024 DXOS.org
//

import { type DocumentId } from '@dxos/automerge/automerge-repo';
import type { CollectionId } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

export const deriveCollectionIdFromSpaceId = (spaceId: SpaceId, rootDocumentId: DocumentId): CollectionId =>
  `space:${spaceId}:${rootDocumentId}` as CollectionId;

export const getSpaceIdFromCollectionId = (collectionId: CollectionId): SpaceId => {
  const spaceId = collectionId.split(':')[1];
  invariant(SpaceId.isValid(spaceId));
  return spaceId;
};
