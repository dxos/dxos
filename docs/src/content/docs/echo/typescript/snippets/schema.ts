//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { Type } from '@dxos/echo';

export const TaskType = S.Struct({
  name: S.String,
  completed: S.optional(S.Boolean),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/Task',
    version: '0.1.0',
  }),
);
