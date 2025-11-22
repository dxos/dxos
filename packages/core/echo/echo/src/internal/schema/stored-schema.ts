//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypenameSchema, VersionSchema } from '../ast';
import { EchoObjectSchema } from '../entities';
import { JsonSchemaType } from '../json-schema';

/**
 * Persistent representation of a schema.
 */
// TODO(burdon): Move.
export const StoredSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: TypenameSchema,
  version: VersionSchema,
  jsonSchema: JsonSchemaType,
}).pipe(
  EchoObjectSchema({
    typename: 'dxos.org/type/Schema',
    version: '0.1.0',
  }),
);

export type StoredSchema = Schema.Schema.Type<typeof StoredSchema>;
