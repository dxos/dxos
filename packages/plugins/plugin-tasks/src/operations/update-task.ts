//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Obj, Ref } from '@dxos/echo';
import { type Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';
import { collectSubtree, findTaskSet } from './task-set-membership';

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
      const taskSet = milestone !== undefined || parentTask !== undefined ? yield* findTaskSet(task) : undefined;

      if (milestone) {
        const belongs = taskSet?.milestones.some((ref) => ref.uri === milestone.uri) ?? false;
        if (!belongs) {
          return yield* Effect.fail(
            new InvalidOperationInput({ message: 'The milestone does not belong to this task set.' }),
          );
        }
      }

      // Re-parenting into the task's own subtree would orphan the whole branch from the set's roots.
      let newParent: Task.Task | undefined;
      if (parentTask) {
        newParent = yield* Database.load(parentTask);
        const subtree = taskSet ? collectSubtree(taskSet, task) : [task];
        if (subtree.some((member) => member.id === newParent!.id)) {
          return yield* Effect.fail(
            new InvalidOperationInput({ message: 'A task cannot be re-parented under itself or its own sub-tasks.' }),
          );
        }
      }

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
        // Cleared with `delete`, not by assigning undefined: the property schemas are optional
        // rather than nullable, and a self-referential `Schema.suspend` (parentTask) rejects the
        // assignment outright.
        if (milestone !== undefined) {
          if (milestone === null) {
            delete task.milestone;
          } else {
            task.milestone = milestone;
          }
        }
        if (parentTask !== undefined) {
          if (newParent) {
            task.parentTask = Ref.make(newParent);
          } else {
            delete task.parentTask;
          }
        }
      });

      // The parent edge follows the hierarchy so a sub-task still cascades with its parent; a task
      // promoted to a root falls back to the set. Set membership is untouched — the task never left.
      if (parentTask !== undefined) {
        const lifecycleParent = newParent ?? taskSet;
        if (lifecycleParent) {
          Obj.setParent(task, lifecycleParent);
        }
      }

      return { task: Entity.toJSON(task) };
    }),
  ),
);

export default handler;
