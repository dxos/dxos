//
// Copyright 2023 DXOS.org
//

import { EchoObject, S } from '@dxos/echo-schema';

// TOOD(burdon): Move to plugin-task.

export const TaskType = S.Struct({
  text: S.String,
  priority: S.optional(S.Number),
  completed: S.optional(S.Boolean),
  // TODO(burdon): Link DID.
  // assigned: DID,
  // TODO(burdon): Created date metadata.
  // due: Date,
  // TODO(burdon): Generic tags.
  // tags: [String],
}).pipe(EchoObject('dxos.org/type/Task', '0.1.0'));

export interface TaskType extends S.Schema.Type<typeof TaskType> {}
