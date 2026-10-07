//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Milestone, TaskSet } from '@dxos/types';

import { TaskOperation } from '#types';

const handler: Operation.WithHandler<typeof TaskOperation.CreateMilestone> = TaskOperation.CreateMilestone.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ taskSet: taskSetRef, name, description, targetDate }) {
      const taskSet = yield* Database.load(taskSetRef);
      const milestone = yield* TaskSet.addPersisted(Milestone.make({ name: name.trim(), description, targetDate }));
      TaskSet.addMilestoneToSet(taskSet, milestone);
      yield* Database.flush();
      return { milestone: milestone };
    }),
  ),
);

export default handler;
