//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { FormatAnnotation, FormatEnum, LabelAnnotation } from '@dxos/echo-schema';

export enum TaskStatus {
  STARTED = 'S',
  BLOCKED = 'B',
  COMPLETE = 'C',
}

/**
 * Task schema.
 */
const TaskSchema = Schema.Struct({
  text: Schema.String,
  // TODO(wittjosiah): Why closed and status?
  closed: Schema.optional(Schema.Boolean),
  status: Schema.optional(Schema.Enums(TaskStatus)),
  priority: Schema.optional(Schema.Number),
  estimate: Schema.optional(Schema.Number),
  assigned: Schema.optional(Schema.String.pipe(FormatAnnotation.set(FormatEnum.DID))),
  // TODO(burdon): Created date metadata.
  // due: Date,
  // TODO(burdon): Generic tags.
  // tags: [String],
}).pipe(LabelAnnotation.set(['text']));

export const Task = TaskSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Task',
    version: '0.1.0',
  }),
);

export interface Task extends Schema.Schema.Type<typeof Task> {}
