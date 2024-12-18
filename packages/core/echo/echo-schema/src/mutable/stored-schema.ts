//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { JsonSchemaType } from '../ast';
import { TypedObject } from '../object';

/**
 * Stored representation of a schema.
 */
// TODO(burdon): How to get the S.Schema object that this represents?
export class StoredSchema extends TypedObject({ typename: 'dxos.org/type/Schema', version: '0.1.0' })({
  typename: S.String,
  version: S.String,
  jsonSchema: JsonSchemaType,
}) {}
