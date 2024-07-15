//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';

export const deriveCollectionIdFromSpaceId = (spaceId: SpaceId): string => `space:${spaceId}`;

export const getSpaceIdFromCollectionId = (collectionId: string): SpaceId => {
  const spaceId = collectionId.replace(/^space:/, '');
  invariant(SpaceId.isValid(spaceId));
  return spaceId;
};
