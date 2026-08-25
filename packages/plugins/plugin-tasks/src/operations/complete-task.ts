//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { TaskOperation } from '#types';

/**
 * Sugar for `taskUpdate` with `status: 'done'` — it guards no invariant of its own, and earns its
 * place only by making the verb discoverable as a tool.
 */
const handler: Operation.WithHandler<typeof TaskOperation.CompleteTask> = TaskOperation.CompleteTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef }) {
      const task = yield* Database.load(taskRef);
      Obj.update(task, (task) => {
        task.status = 'done';
      });
      return { task: task };
    }),
  ),
);

export default handler;
