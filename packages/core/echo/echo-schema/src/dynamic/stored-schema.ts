//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TypedObject } from '../typed-object-class';

export class StoredEchoSchema extends TypedObject({ typename: 'dxos.echo.StoredSchema', version: '0.1.0' })({
  typename: S.String,
  version: S.String,
  jsonSchema: S.Any,
}) {}
