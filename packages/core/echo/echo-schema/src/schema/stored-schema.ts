//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { EchoObject, JsonSchemaType } from '../ast';

/**
 * Persistent representation of a schema.
 */
export const StoredSchema = S.Struct({
  typename: S.String,
  version: S.String,
  jsonSchema: JsonSchemaType,
}).pipe(EchoObject('dxos.org/type/Schema', '0.1.0'));

export type StoredSchema = S.Schema.Type<typeof StoredSchema>;
