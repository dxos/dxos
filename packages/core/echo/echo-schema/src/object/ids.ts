//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { ulid } from 'ulidx';

import { SpaceId } from '@dxos/keys';

// TODO(dmaretskyi): Make brand.
// export const ObjectIdBrand: unique symbol = Symbol('@dxos/echo/ObjectId');
// export const ObjectIdSchema = S.ULID.pipe(S.brand(ObjectIdBrand));
export const ObjectIdSchema = S.ULID;

export type ObjectId = typeof ObjectIdSchema.Type;

export interface ObjectIdClass extends S.SchemaClass<ObjectId, string> {
  isValid(id: string): id is ObjectId;
  random(): ObjectId;
}

// TODO(dmaretskyi): Move to @dxos/keys. Normalize with SpaceId.
export const ObjectId: ObjectIdClass = class extends ObjectIdSchema {
  static isValid(id: string): id is ObjectId {
    try {
      S.decodeSync(ObjectId)(id);
      return true;
    } catch (err) {
      return false;
    }
  }

  static random(): ObjectId {
    return ulid() as ObjectId;
  }
};

// TODO(burdon): Namespace (e.g., Key.SpaceId).
export const SpaceIdSchema: S.Schema<SpaceId, string> = S.String.pipe(S.filter(SpaceId.isValid));
