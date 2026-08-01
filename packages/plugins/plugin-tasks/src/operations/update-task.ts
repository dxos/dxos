//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';

import { TaskOperation } from '../types';

const handler: Operation.WithHandler<typeof TaskOperation.UpdateTask> = TaskOperation.UpdateTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task, title, description, status, priority, estimate, assignee }) {
      Obj.update(task, (task) => {
        if (title !== undefined) {
          task.title = title;
        }
        if (description !== undefined) {
          task.description = description;
        }
        if (status !== undefined) {
          task.status = status;
        }
        if (priority !== undefined) {
          task.priority = priority;
        }
        if (estimate !== undefined) {
          task.estimate = estimate;
        }
        if (assignee !== undefined) {
          task.assignee = assignee;
        }
      });
      return { task };
    }),
  ),
);

export default handler;
