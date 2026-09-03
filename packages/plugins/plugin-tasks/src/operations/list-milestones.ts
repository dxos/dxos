//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, type Obj, type Ref } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const handler: Operation.WithHandler<typeof TaskOperation.ListMilestones> = TaskOperation.ListMilestones.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ taskSet: taskSetRef, project }) {
      if (!taskSetRef && !project) {
        return yield* Effect.fail(new InvalidOperationInput({ message: 'Provide either `taskSet` or `project`.' }));
      }
      if (taskSetRef && project) {
        return yield* Effect.fail(
          new InvalidOperationInput({ message: 'Provide exactly one of `taskSet` or `project`.' }),
        );
      }

      let taskSet: TaskSet.TaskSet | undefined;
      if (taskSetRef) {
        taskSet = yield* Database.load(taskSetRef);
      } else if (project) {
        const projectObject = yield* Database.load(project);
        // Structural read — plugin-tasks must not depend on @dxos/compute (see `list-tasks`).
        const ref = (projectObject as { taskSet?: Ref.Ref<Obj.Unknown> }).taskSet;
        taskSet = ref
          ? ((yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined))) as TaskSet.TaskSet | undefined)
          : undefined;
      }

      if (!taskSet) {
        return { milestones: [] };
      }

      // Loaded, not resolved: cold refs dropped here would shorten the list and skew progress.
      const tasks = yield* TaskSet.loadTasks(taskSet);
      const milestones = (yield* TaskSet.loadMilestones(taskSet)).map((milestone) => {
        const { total, done } = Task.milestoneProgress(tasks, milestone);
        return {
          id: milestone.id,
          name: milestone.name,
          description: milestone.description,
          targetDate: milestone.targetDate,
          total,
          done,
        };
      });

      return { milestones };
    }),
  ),
);

export default handler;
