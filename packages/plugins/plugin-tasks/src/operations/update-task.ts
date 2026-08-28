//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';

const handler: Operation.WithHandler<typeof TaskOperation.UpdateTask> = TaskOperation.UpdateTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      task: taskRef,
      title,
      description,
      status,
      priority,
      estimate,
      assignee,
      milestone,
      parentTask,
    }) {
      const task = yield* Database.load(taskRef);
      const taskSet =
        milestone !== undefined || parentTask !== undefined ? yield* TaskSet.findTaskSet(task) : undefined;

      // Compared by entity id: the same object may be addressed local or space-qualified.
      if (milestone) {
        const milestoneId = TaskSet.refEntityId(milestone);
        const belongs = taskSet?.milestones.some((ref) => TaskSet.refEntityId(ref) === milestoneId) ?? false;
        if (!belongs) {
          return yield* Effect.fail(
            new InvalidOperationInput({ message: 'The milestone does not belong to this task set.' }),
          );
        }
      }

      const newParent = parentTask ? yield* TaskSet.resolveParentTask(taskSet, task, parentTask) : undefined;

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
        // Cleared with `delete`, not by assigning undefined: the property schema is optional rather
        // than nullable.
        if (milestone !== undefined) {
          if (milestone === null) {
            delete task.milestone;
          } else {
            task.milestone = milestone;
          }
        }
      });

      // Set membership is untouched — the task never left; only its place in the tree moved.
      if (parentTask !== undefined) {
        TaskSet.applyParentTask(taskSet, task, newParent);
      }

      return { task: task };
    }),
  ),
);

export default handler;
