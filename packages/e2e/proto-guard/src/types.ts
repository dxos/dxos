//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

export class Todo extends Type.makeObject<Todo>(DXN.make('com.example.type.todo', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
  }),
) {}
