//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

export const Task = Schema.Struct({
  title: Schema.String,
  completed: Schema.Boolean,
}).pipe(Type.makeObject(DXN.make('com.example.type.task', '0.1.0')));

export type Task = Type.InstanceType<typeof Task>;
