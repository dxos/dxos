//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';
import { findTaskSet, refEntityId, reorder } from './task-set-membership';

/** Repositions a task in its set's `tasks` array — there is no sort key, the array order is the order. */
const handler: Operation.WithHandler<typeof TaskOperation.MoveTask> = TaskOperation.MoveTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, before }) {
      const task = yield* Database.load(taskRef);
      const taskSet = yield* findTaskSet(task);
      if (!taskSet) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task does not belong to a task set.' }));
      }

      const beforeId = before ? refEntityId(before) : undefined;
      Obj.update(taskSet, (taskSet) => {
        taskSet.tasks = reorder(taskSet.tasks, task.id, beforeId);
      });

      return { task: task };
    }),
  ),
);

export default handler;
