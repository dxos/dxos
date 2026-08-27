//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';
import { addTaskToSet, refEntityId } from './task-set-membership';

const handler: Operation.WithHandler<typeof TaskOperation.CreateTask> = TaskOperation.CreateTask.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      taskSet: taskSetRef,
      title,
      description,
      priority,
      assignee,
      parentTask,
      milestone,
    }) {
      const taskSet = yield* Database.load(taskSetRef);
      const parent = parentTask ? yield* Database.load(parentTask) : undefined;

      // A task may only be filed under a milestone of its own set — the milestone sequence is what
      // the set renders, so a cross-set ref would show work under a milestone that never lists it.
      // Compared by entity id: the same object may be addressed local or space-qualified.
      if (milestone) {
        const milestoneId = refEntityId(milestone);
        const belongs = taskSet.milestones.some((ref) => refEntityId(ref) === milestoneId);
        if (!belongs) {
          return yield* Effect.fail(
            new InvalidOperationInput({ message: 'The milestone does not belong to this task set.' }),
          );
        }
      }

      // A cross-set parent would flatten the hierarchy here (the parent id is absent from this set,
      // so the task reads as a root) and hand the task's lifecycle to the other set's cascade.
      // Membership is checked on the ref array, not by dereferencing — the targets need not be loaded.
      if (parent && !taskSet.tasks.some((ref) => refEntityId(ref) === parent.id)) {
        return yield* Effect.fail(
          new InvalidOperationInput({ message: 'The parent task does not belong to this task set.' }),
        );
      }

      const task = yield* Database.add(
        Task.make({
          title: title.trim(),
          status: 'todo',
          description,
          priority,
          assignee,
          parentTask: parent ? Ref.make(parent) : undefined,
          milestone,
        }),
      );
      // Flushed before the set gains the ref: the two live in separate documents, so a crash
      // between the writes must strand an unfiled task, never a set entry pointing at nothing.
      yield* Database.flush();
      addTaskToSet(taskSet, task, parent);
      yield* Database.flush();
      return { task: task };
    }),
  ),
);

export default handler;
