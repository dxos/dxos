//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

export const TaskType = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(
  Type.object({
    typename: 'com.example.type.task',
    version: '0.1.0',
  }),
);
