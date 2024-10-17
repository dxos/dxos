//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/effect';

import { TypedObject } from '../object';

// TODO(burdon): Consistent names. Enforce in constructor.
export class StoredSchema extends TypedObject({ typename: 'dxos.org/type/StoredSchema', version: '0.1.0' })({
  typename: S.String,
  version: S.String,
  jsonSchema: S.Any,
}) {}
