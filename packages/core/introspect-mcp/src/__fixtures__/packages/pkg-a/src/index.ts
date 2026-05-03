//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';

/**
 * Task item — fixture ECHO type.
 */
export const Task = Schema.Struct({
  title: Schema.String,
  done: Schema.Boolean,
}).pipe(
  Type.object({
    typename: 'com.example.type.Task',
    version: '0.1.0',
  }),
);

export type Task = Schema.Schema.Type<typeof Task>;

/**
 * Task factory.
 */
export const make = (props: { title: string; done?: boolean }) => Obj.make(Task, { done: false, ...props });
