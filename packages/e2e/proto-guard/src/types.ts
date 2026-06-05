//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

export const Todo = Schema.Struct({
  name: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.todo', '0.1.0')));

export type Todo = Type.InstanceType<typeof Todo>;
