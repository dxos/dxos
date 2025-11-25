//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypenameSchema, VersionSchema } from '../annotations';
import { EchoObjectSchema } from '../entities';
import { JsonSchemaType } from '../json-schema';

/**
 * Persistent representation of a schema.
 */
// TODO(burdon): Move.
const PersistentEchoSchema = Schema.Struct({
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
export interface PersistentSchema extends Schema.Schema.Type<typeof PersistentEchoSchema> {}
export interface PersistentSchemaEncoded extends Schema.Schema.Encoded<typeof PersistentEchoSchema> {}
export const PersistentSchema: Schema.Schema<PersistentSchema, PersistentSchemaEncoded> = PersistentEchoSchema;
