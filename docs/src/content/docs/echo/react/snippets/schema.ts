//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

export const Task = Schema.Struct({
  name: Schema.String,
  completed: Schema.optional(Schema.Boolean),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Task',
    version: '0.1.0',
  }),
);
