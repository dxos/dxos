//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo/internal';

export class TaskType extends TypedObject({
  typename: 'dxos.org/type/Task',
  version: '0.1.0',
})({
  name: Schema.String,
  completed: Schema.optional(Schema.Boolean),
}) {}
