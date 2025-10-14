//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

export const Task = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Task',
    version: '0.1.0',
  }),
);

export type Task = Schema.Schema.Type<typeof Task>;
