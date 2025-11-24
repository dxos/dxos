//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

export const Todo = Schema.Struct({
  name: Schema.optional(Schema.String),
}).pipe(
  Type.Obj({
    typename: 'example.org/type/Todo',
    version: '0.1.0',
  }),
);
