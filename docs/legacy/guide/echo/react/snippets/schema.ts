//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { DXN, Type } from '@dxos/echo';

export class TaskType extends Type.makeObject<TaskType>(DXN.make('org.dxos.type.task', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    completed: Schema.optional(Schema.Boolean),
  }),
) {}
