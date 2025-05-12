//
// Copyright 2023 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { FormatAnnotation, FormatEnum, LabelAnnotationId, S } from '@dxos/echo-schema';

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
  closed: Schema.optional(S.Boolean),
  status: Schema.optional(S.Enums(TaskStatus)),
  priority: Schema.optional(S.Number),
  estimate: Schema.optional(S.Number),
  assigned: Schema.optional(S.String.pipe(FormatAnnotation.set(FormatEnum.DID))),
  // TODO(burdon): Created date metadata.
  // due: Date,
  // TODO(burdon): Generic tags.
  // tags: [String],
}).annotations({ [LabelAnnotationId]: 'text' });

export const Task = TaskSchema.pipe(
  Type.def({
    typename: 'dxos.org/type/Task',
    version: '0.1.0',
  }),
);

export interface Task extends Schema.Schema.Type<typeof Task> {}
