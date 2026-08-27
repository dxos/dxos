//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';
import { applyParentTask, findTaskSet, refEntityId, reorder, resolveParentTask } from './task-set-membership';

const handler: Operation.WithHandler<typeof TaskOperation.MoveTask> = TaskOperation.MoveTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, before, parentTask }) {
      const task = yield* Database.load(taskRef);
      const taskSet = yield* findTaskSet(task);
      if (!taskSet) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task does not belong to a task set.' }));
      }

      // Resolved before either write, so a rejected parent leaves the position untouched too — a
      // drop is one gesture and must not half-apply.
      const newParent = parentTask ? yield* resolveParentTask(taskSet, task, parentTask) : undefined;

      const beforeId = before ? refEntityId(before) : undefined;
      Obj.update(taskSet, (taskSet) => {
        taskSet.tasks = reorder(taskSet.tasks, task.id, beforeId);
      });

      if (parentTask !== undefined) {
        applyParentTask(taskSet, task, newParent);
      }

      return { task: task };
    }),
  ),
);

export default handler;
