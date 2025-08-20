//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { ulid } from 'ulidx';

// TODO(dmaretskyi): Make brand.
// export const ObjectIdBrand: unique symbol = Symbol('@dxos/echo/ObjectId');
// export const ObjectIdSchema = Schema.ULID.pipe(S.brand(ObjectIdBrand));
const ObjectIdSchema = Schema.String.pipe(Schema.pattern(/^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i)).annotations({
  description: 'A Universally Unique Lexicographically Sortable Identifier',
  pattern: '^[0-7][0-9A-HJKMNP-TV-Z]{25}$',
});

export type ObjectId = typeof ObjectIdSchema.Type;

export interface ObjectIdClass extends Schema.SchemaClass<ObjectId, string> {
  isValid(id: string): id is ObjectId;
  make(id: string): ObjectId;
  random(): ObjectId;
}

/**
 * Randomly generated unique identifier for an object.
 *
 * Follows ULID spec.
 */
export const ObjectId: ObjectIdClass = class extends ObjectIdSchema {
  static isValid(id: string): id is ObjectId {
    try {
      Schema.decodeSync(ObjectId)(id);
      return true;
    } catch {
      return false;
    }
  }

  static random(): ObjectId {
    return ulid() as ObjectId;
  }
};
