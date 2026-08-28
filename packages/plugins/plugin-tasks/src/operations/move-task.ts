//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';

const handler: Operation.WithHandler<typeof TaskOperation.MoveTask> = TaskOperation.MoveTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, before, parentTask }) {
      const task = yield* Database.load(taskRef);
      const taskSet = yield* TaskSet.findTaskSet(task);
      if (!taskSet) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task does not belong to a task set.' }));
      }

      // Resolved before either write, so a rejected parent leaves the position untouched too — a
      // drop is one gesture and must not half-apply.
      const newParent = parentTask ? yield* TaskSet.resolveParentTask(taskSet, task, parentTask) : undefined;

      TaskSet.moveTask(taskSet, task, {
        ...(parentTask !== undefined ? { parentTask: newParent ?? null } : {}),
        beforeId: before ? Task.refEntityId(before) : undefined,
      });

      return { task: task };
    }),
  ),
);

export default handler;
