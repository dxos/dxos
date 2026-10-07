//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.DeleteMilestone> = TaskOperation.DeleteMilestone.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ milestone: milestoneRef }) {
      const milestone = yield* Database.load(milestoneRef);
      const taskSet = yield* TaskSet.findMilestoneTaskSet(milestone);

      let releasedTasks = 0;
      if (taskSet) {
        // Loaded, not resolved: a cold task skipped here would keep a dangling milestone ref.
        for (const task of yield* TaskSet.loadTasks(taskSet)) {
          if (task.milestone && Task.refEntityId(task.milestone) === milestone.id) {
            Obj.update(task, (task) => {
              delete task.milestone;
            });
            releasedTasks++;
          }
        }
        Obj.update(taskSet, (taskSet) => {
          taskSet.milestones = taskSet.milestones.filter((ref) => Task.refEntityId(ref) !== milestone.id);
        });
      }

      yield* Database.remove(milestone);
      yield* Database.flush();

      return { releasedTasks };
    }),
  ),
);

export default handler;
