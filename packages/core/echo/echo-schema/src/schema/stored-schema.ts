//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { JsonSchemaType } from '../json-schema';
import { EchoObject } from '../object';

/**
 * Persistent representation of a schema.
 */
export const StoredSchema = Schema.Struct({
  typename: Schema.String,
  version: Schema.String,
  jsonSchema: JsonSchemaType,
}).pipe(
  EchoObject({
    typename: 'dxos.org/type/Schema',
    version: '0.1.0',
  }),
);

export type StoredSchema = Schema.Schema.Type<typeof StoredSchema>;
