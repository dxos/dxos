//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

export const Todo = Schema.Struct({
  name: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'com.example.type.todo',
    version: '0.1.0',
  }),
);

export interface Todo extends Schema.Schema.Type<typeof Todo> {}
