//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObjectSchema } from '../echo-object-class';

export class StoredEchoSchema extends EchoObjectSchema({ typename: 'dxos.echo.StoredSchema', version: '0.1.0' })({
  typename: S.string,
  version: S.string,
  jsonSchema: S.any,
}) {}
