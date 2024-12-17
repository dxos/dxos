//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { ulid } from 'ulidx';

export const ObjectIdBrand: unique symbol = Symbol('@dxos/echo/ObjectId');

// TODO(dmaretskyi): Make brand.
// export const ObjectIdSchema = S.ULID.pipe(S.brand(ObjectIdBrand));
export const ObjectIdSchema = S.ULID;

export type ObjectId = typeof ObjectIdSchema.Type;

export interface ObjectIdClass extends S.SchemaClass<ObjectId, string> {
  isValid(id: string): id is ObjectId;
  random(): ObjectId;
}

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

export const createObjectId = () => ObjectId.random();
