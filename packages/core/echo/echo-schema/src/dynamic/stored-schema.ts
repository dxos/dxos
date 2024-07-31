//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { TypedObject } from '../typed-object-class';

export class StoredSchema extends TypedObject({ typename: 'dxos.echo.StoredSchema', version: '0.1.0' })({
  typename: S.String,
  version: S.String,
  jsonSchema: S.Any,
}) {}
