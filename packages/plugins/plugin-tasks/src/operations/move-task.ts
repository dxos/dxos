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
    Effect.fnUntraced(function* ({ task: taskRef, taskSet: taskSetRef, before, parentTask }) {
      // Database.peekOrLoad short-circuits for materialized refs, so with a materialized input
      // the whole handler completes without an async boundary — a drop runs it under
      // `Effect.runSync` in the gesture frame; unloaded refs (e.g. an agent caller) load
      // asynchronously instead.
      const task = yield* Database.peekOrLoad(taskRef);
      const taskSet = yield* Database.peekOrLoad(taskSetRef);

      // The set arrives as input rather than being derived from membership, so membership is a
      // precondition: moving a non-member would leave the array untouched yet still re-parent the
      // task into this set.
      if (!taskSet.tasks.some((ref) => Task.refEntityId(ref) === task.id)) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task does not belong to the task set.' }));
      }

      // Resolved before either write, so a rejected parent leaves the position untouched too — a
      // drop is one gesture and must not half-apply.
      const newParent = parentTask ? yield* TaskSet.resolveParentTask(taskSet, task, parentTask) : undefined;

      TaskSet.moveTask(taskSet, task, {
        ...(parentTask !== undefined ? { parentTask: newParent ?? null } : {}),
        beforeId: before ? Task.refEntityId(before) : undefined,
      });

      return { task };
    }),
  ),
);

export default handler;
