//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { SchemaVersion, Typename } from '../ast';
import { JsonSchemaType } from '../json-schema';
import { EchoObject } from '../object';

/**
 * Persistent representation of a schema.
 */
export const StoredSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  typename: Typename,
  version: SchemaVersion,
  jsonSchema: JsonSchemaType,
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/Schema',
    version: '0.1.0',
  }),
);

export type StoredSchema = Schema.Schema.Type<typeof StoredSchema>;
