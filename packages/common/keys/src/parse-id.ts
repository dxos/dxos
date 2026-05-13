//
// Copyright 2024 DXOS.org
//

import { type ObjectId } from './object-id';
import { type SpaceId } from './space-id';

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
