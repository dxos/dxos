//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { Task, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

import { InvalidOperationInput } from '../errors.ts';

const handler: Operation.WithHandler<typeof TaskOperation.MoveMilestone> = TaskOperation.MoveMilestone.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ milestone: milestoneRef, before }) {
      const milestone = yield* Database.load(milestoneRef);
      const taskSet = yield* TaskSet.findMilestoneTaskSet(milestone);
      if (!taskSet) {
        return yield* Effect.fail(
          new InvalidOperationInput({ message: 'The milestone does not belong to a task set.' }),
        );
      }

      const beforeId = before ? Task.refEntityId(before) : undefined;
      Obj.update(taskSet, (taskSet) => {
        taskSet.milestones = TaskSet.reorder(taskSet.milestones, milestone.id, beforeId);
      });

      return { milestone: milestone };
    }),
  ),
);

export default handler;
