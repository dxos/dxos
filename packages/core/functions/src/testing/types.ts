//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { TypedObject } from '@dxos/echo-schema';

export class TestType extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  title: S.String,
}) {}
