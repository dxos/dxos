//
// Copyright 2023 DXOS.org
//

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
export const TaskSchema = S.Struct({
  text: S.String,
  // TODO(wittjosiah): Why closed and status?
  closed: S.optional(S.Boolean),
  status: S.optional(S.Enums(TaskStatus)),
  priority: S.optional(S.Number),
  estimate: S.optional(S.Number),
  assigned: S.optional(S.String.pipe(FormatAnnotation.set(FormatEnum.DID))),
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

export interface Task extends S.Schema.Type<typeof Task> {}
