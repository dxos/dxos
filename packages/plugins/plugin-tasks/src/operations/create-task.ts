//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity, Ref } from '@dxos/echo';
import { Task } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors';
import { addTaskToSet } from './task-set-membership';

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
      if (milestone) {
        const belongs = taskSet.milestones.some((ref) => ref.uri === milestone.uri);
        if (!belongs) {
          return yield* Effect.fail(
            new InvalidOperationInput({ message: 'The milestone does not belong to this task set.' }),
          );
        }
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
      addTaskToSet(taskSet, task, parent);
      yield* Database.flush();
      return { task: Entity.toJSON(task) };
    }),
  ),
);

export default handler;
