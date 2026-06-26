//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { DXN, Type } from '@dxos/echo';

export class Task extends Type.makeObject<Task>(DXN.make('org.dxos.type.task', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    completed: Schema.optional(Schema.Boolean),
  }),
) {}
