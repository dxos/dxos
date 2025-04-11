//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { EchoObject, JsonSchemaType } from '../ast';

// import { EchoObject, JsonSchemaType } from '../ast';

/**
 * Stored representation of a schema.
 */
// TODO(burdon): How to get the S.Schema object that this represents?
// export class StoredSchema extends TypedObject({ typename: 'dxos.org/type/Schema', version: '0.1.0' })({
//   typename: S.String,
//   version: S.String,
//   jsonSchema: JsonSchemaType,
// }) {}

export const StoredSchema = S.Struct({
  typename: S.String,
  version: S.String,
  jsonSchema: JsonSchemaType,
}).pipe(EchoObject('dxos.org/type/Schema', '0.1.0'));

export interface StoredSchema extends S.Schema.Type<typeof StoredSchema> {}
