//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';

/**
 * Task item — fixture ECHO type used to verify symbol extraction against
 * realistic DXOS shapes (Schema.Struct + Type.object + annotations).
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
}).pipe(
  Type.object({
    typename: 'com.example.type.Task',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['title']),
);

export interface Task extends Schema.Schema.Type<typeof Task> {}

/**
 * Task factory — mirrors the make/Obj.make pattern used by real plugins.
 */
export const make = (props: { title: string; description?: string; done?: boolean }) =>
  Obj.make(Task, { done: false, ...props });
