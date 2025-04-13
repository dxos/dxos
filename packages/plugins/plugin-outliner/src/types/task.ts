//
// Copyright 2023 DXOS.org
//

import { EchoObject, FormatAnnotationId, FormatEnum, LabelAnnotationId, S } from '@dxos/echo-schema';

// TOOD(burdon): Move to plugin-task.

// TODO(burdon): Boolean? Can tables handle this?
export enum TaskStatus {
  STARTED = 'S',
  BLOCKED = 'B',
  COMPLETE = 'C',
}

export const TaskType = S.Struct({
  text: S.String,
  closed: S.optional(S.Boolean),
  status: S.optional(S.Enums(TaskStatus)),
  priority: S.optional(S.Number),
  estimate: S.optional(S.Number),
  assigned: S.optional(S.String.annotations({ [FormatAnnotationId]: FormatEnum.DID })),
  // TODO(burdon): Created date metadata.
  // due: Date,
  // TODO(burdon): Generic tags.
  // tags: [String],
})
  .pipe(EchoObject({ typename: 'dxos.org/type/Task', version: '0.1.0' }))
  .annotations({ [LabelAnnotationId]: 'text' });

export interface TaskType extends S.Schema.Type<typeof TaskType> {}
