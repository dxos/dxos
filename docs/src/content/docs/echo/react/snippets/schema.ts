//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';

import { EchoObject } from '@dxos/echo-schema';

export const TaskType = S.Struct({
  name: S.String,
  completed: S.optional(S.Boolean),
}).pipe(EchoObject('dxos.org/type/Task', '0.1.0'));
