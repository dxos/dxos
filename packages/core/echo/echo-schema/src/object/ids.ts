//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { ulid } from 'ulidx';

import { SpaceId } from '@dxos/keys';

// TODO(dmaretskyi): Make brand.
// export const ObjectIdBrand: unique symbol = Symbol('@dxos/echo/ObjectId');
// export const ObjectIdSchema = Schema.ULID.pipe(S.brand(ObjectIdBrand));
const ObjectIdSchema = Schema.ULID;

export type ObjectId = typeof ObjectIdSchema.Type;

export interface ObjectIdClass extends Schema.SchemaClass<ObjectId, string> {
  isValid(id: string): id is ObjectId;
  random(): ObjectId;
}

// TODO(dmaretskyi): Move to @dxos/keys. Normalize with SpaceId.
export const ObjectId: ObjectIdClass = class extends ObjectIdSchema {
  static isValid(id: string): id is ObjectId {
    try {
      Schema.decodeSync(ObjectId)(id);
      return true;
    } catch (err) {
      return false;
    }
  }

  static random(): ObjectId {
    return ulid() as ObjectId;
  }
};

export const SpaceIdSchema: Schema.Schema<SpaceId, string> = Schema.String.pipe(Schema.filter(SpaceId.isValid));
