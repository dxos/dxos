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
export const ObjectId: S.SchemaClass<ObjectId, string> & { random(): ObjectId } = class extends ObjectIdSchema {
  static random(): ObjectId {
    return ulid() as ObjectId;
  }
};

export const createObjectId = () => ObjectId.random();
