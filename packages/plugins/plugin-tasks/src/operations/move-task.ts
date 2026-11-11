//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

/**
 * The set holding the task's root, read off the root's parent edge rather than queried: the
 * operation declares no services, so a drop can still run it under `Effect.runSync`.
 */
const owningTaskSet = (task: Task.Task) =>
  Task.collectRoot(task).pipe(
    Effect.map((root) => {
      const parent = Obj.getParent(root);
      return TaskSet.instanceOf(parent) ? parent : undefined;
    }),
  );

const handler: Operation.WithHandler<typeof TaskOperation.MoveTask> = TaskOperation.MoveTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, taskSet: taskSetRef, before, parentTask }) {
      const task = Database.peek(taskRef) ?? (yield* Database.load(taskRef));
      const taskSet = taskSetRef
        ? (Database.peek(taskSetRef) ?? (yield* Database.load(taskSetRef)))
        : yield* owningTaskSet(task);
      if (!taskSet) {
        return yield* Effect.fail(
          new InvalidOperationInput({ message: 'The task belongs to no task set; pass `taskSet`.' }),
        );
      }

      if (!TaskSet.ensureMember(taskSet, task)) {
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
