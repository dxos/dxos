//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Entity } from '@dxos/echo';
import { Milestone } from '@dxos/types';

import { TaskOperation } from '#types';

import { addMilestoneToSet } from './task-set-membership';

const handler: Operation.WithHandler<typeof TaskOperation.CreateMilestone> = TaskOperation.CreateMilestone.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ taskSet: taskSetRef, name, description, targetDate }) {
      const taskSet = yield* Database.load(taskSetRef);
      const milestone = yield* Database.add(Milestone.make({ name: name.trim(), description, targetDate }));
      addMilestoneToSet(taskSet, milestone);
      yield* Database.flush();
      return { milestone: Entity.toJSON(milestone) };
    }),
  ),
);

export default handler;
