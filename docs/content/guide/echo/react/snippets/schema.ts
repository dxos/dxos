//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export class TaskType extends TypedObject({
  typename: 'dxos.org/type/Task',
  version: '0.1.0',
})({
  name: S.String,
  completed: S.optional(S.Boolean),
}) {}
