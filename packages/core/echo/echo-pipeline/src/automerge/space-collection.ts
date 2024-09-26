//
// Copyright 2024 DXOS.org
//

import type { CollectionId } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

export const deriveCollectionIdFromSpaceId = (spaceId: SpaceId): CollectionId => `space:${spaceId}` as CollectionId;

export const getSpaceIdFromCollectionId = (collectionId: CollectionId): SpaceId => {
  const spaceId = collectionId.replace(/^space:/, '');
  invariant(SpaceId.isValid(spaceId));
  return spaceId;
};
