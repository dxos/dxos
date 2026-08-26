//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { findMilestoneTaskSet, refEntityId } from './task-set-membership';

const handler: Operation.WithHandler<typeof TaskOperation.DeleteMilestone> = TaskOperation.DeleteMilestone.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ milestone: milestoneRef }) {
      const milestone = yield* Database.load(milestoneRef);
      const taskSet = yield* findMilestoneTaskSet(milestone);

      let releasedTasks = 0;
      if (taskSet) {
        for (const task of TaskSet.resolveTasks(taskSet)) {
          if (task.milestone && refEntityId(task.milestone) === milestone.id) {
            Obj.update(task, (task) => {
              delete task.milestone;
            });
            releasedTasks++;
          }
        }
        Obj.update(taskSet, (taskSet) => {
          taskSet.milestones = taskSet.milestones.filter((ref) => refEntityId(ref) !== milestone.id);
        });
      }

      yield* Database.remove(milestone);
      yield* Database.flush();

      return { releasedTasks };
    }),
  ),
);

export default handler;
