//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TypedObject } from '@dxos/echo-schema';

export class Todo extends TypedObject({
  typename: 'example.org/type/Todo',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
}) {}
