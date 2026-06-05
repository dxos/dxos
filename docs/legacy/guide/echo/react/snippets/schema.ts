//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { DXN, Type } from '@dxos/echo';

export const TaskType = Schema.Struct({
  name: Schema.String,
  completed: Schema.optional(Schema.Boolean),
}).pipe(Type.makeObject(DXN.make('org.dxos.type.task', '0.1.0')));

export interface TaskType extends Schema.Schema.Type<typeof TaskType> {}
