//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

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
        const milestoneId = Task.refEntityId(milestone);
        const belongs = taskSet.milestones.some((ref) => Task.refEntityId(ref) === milestoneId);
        if (!belongs) {
          return yield* Effect.fail(
            new InvalidOperationInput({ message: 'The milestone does not belong to this task set.' }),
          );
        }
      }

      // A parent outside the set would file the task in another set's tree.
      if (parent && !TaskSet.ensureMember(taskSet, parent)) {
        return yield* Effect.fail(
          new InvalidOperationInput({ message: 'The parent task does not belong to this task set.' }),
        );
      }

      const task = yield* TaskSet.addPersisted(
        Task.make({
          title: title.trim(),
          status: 'todo',
          description,
          priority,
          assignee,
          milestone,
        }),
      );
      TaskSet.addTaskToSet(taskSet, task, { parent });
      yield* Database.flush();
      return { task: task };
    }),
  ),
);

export default handler;
