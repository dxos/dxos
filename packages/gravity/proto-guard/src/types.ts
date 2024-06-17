//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TypedObject } from '@dxos/echo-schema';

export class Todo extends TypedObject({
  typename: 'example.test.Task.Todo',
  version: '0.1.0',
})({
  name: S.optional(S.String),
}) {}
