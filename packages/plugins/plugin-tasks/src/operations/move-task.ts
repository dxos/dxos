//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { type Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';

const handler: Operation.WithHandler<typeof TaskOperation.MoveTask> = TaskOperation.MoveTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ task: taskRef, taskSet: taskSetRef, before, parentTask }) {
      // Working-set reads only: the operation is synchronous (a drop runs it in the gesture
      // frame), so unloaded refs are a caller error rather than a load trigger.
      const task = taskRef.target;
      const taskSet = taskSetRef.target;
      if (!task || !taskSet) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'The task and task set must be loaded.' }));
      }

      // Resolved before either write, so a rejected parent leaves the position untouched too — a
      // drop is one gesture and must not half-apply.
      const newParent = parentTask ? yield* resolveParent(taskSet, task, parentTask) : undefined;

      TaskSet.moveTask(taskSet, task, {
        ...(parentTask !== undefined ? { parentTask: newParent ?? null } : {}),
        beforeId: before ? Task.refEntityId(before) : undefined,
      });

      return { task };
    }),
  ),
);

export default handler;

/** Sync counterpart of {@link TaskSet.resolveParentTask}: the cycle check sees the set's loaded members. */
const resolveParent = (
  taskSet: TaskSet.TaskSet,
  task: Task.Task,
  parentTask: Ref.Ref<Task.Task>,
): Effect.Effect<Task.Task, InvalidOperationInput | TaskSet.InvalidParentTaskError> =>
  Effect.suspend((): Effect.Effect<Task.Task, InvalidOperationInput | TaskSet.InvalidParentTaskError> => {
    const candidate = parentTask.target;
    if (!candidate) {
      return Effect.fail(new InvalidOperationInput({ message: 'The parent task must be loaded.' }));
    }
    const members = taskSet.tasks
      .map((ref) => ref.target)
      .filter((member): member is Task.Task => member !== undefined);
    if (Task.subtree(members, task).some((member) => member.id === candidate.id)) {
      return Effect.fail(
        new TaskSet.InvalidParentTaskError({
          message: 'A task cannot be re-parented under itself or its own sub-tasks.',
        }),
      );
    }
    if (!taskSet.tasks.some((ref) => Task.refEntityId(ref) === candidate.id)) {
      return Effect.fail(
        new TaskSet.InvalidParentTaskError({ message: 'The parent task does not belong to this task set.' }),
      );
    }
    return Effect.succeed(candidate);
  });
