//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.AcceptTask> = TaskOperation.AcceptTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, actor }) {
      const task = yield* Database.load(taskRef);
      const previousStatus = task.status;
      Task.approve(task, actor ? { actor } : {});
      if (task.status !== previousStatus) {
        yield* Trace.write(Trace.TaskStatusChanged, {
          taskId: task.id,
          title: task.title,
          status: 'done',
          ...(previousStatus ? { previousStatus } : {}),
        });
      }
      yield* Database.flush();
    }),
  ),
);

export default handler;
