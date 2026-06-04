//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

/**
 * Task item — fixture ECHO type used to verify symbol extraction against
 * realistic DXOS shapes (Schema.Struct + Type.makeObject + annotations).
 */
export const Task = Schema.Struct({
  title: Schema.String.annotations({
    description: 'Short summary of the task.',
  }),
  description: Schema.optional(
    Schema.String.annotations({
      description: 'Longer free-form notes about the task.',
    }),
  ),
  done: Schema.Boolean.annotations({
    description: 'Whether the task has been completed.',
  }),
}).pipe(Type.makeObject(DXN.make('com.example.type.Task', '0.1.0')), LabelAnnotation.set(['title']));

export type Task = Type.InstanceType<typeof Task>;

/**
 * Task factory — mirrors the make/Obj.make pattern used by real plugins.
 *
 * @idiom com.example.idiom.taskFactory
 * applies: when constructing a Task with default `done: false`
 * instead-of: hand-rolling `{ done: false, ...props }`
 * uses: {@link Task}
 */
export const make = (props: { title: string; description?: string; done?: boolean }) =>
  Obj.make(Task, { done: false, ...props });
