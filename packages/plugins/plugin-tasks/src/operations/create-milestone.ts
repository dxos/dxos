//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { Milestone } from '@dxos/types';

import { TaskOperation } from '#types';

import { addMilestoneToSet } from './task-set-membership';

const handler: Operation.WithHandler<typeof TaskOperation.CreateMilestone> = TaskOperation.CreateMilestone.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ taskSet: taskSetRef, name, description, targetDate }) {
      const taskSet = yield* Database.load(taskSetRef);
      const milestone = yield* Database.add(Milestone.make({ name: name.trim(), description, targetDate }));
      // Flushed before the set gains the ref (see `create-task`): a crash between the writes must
      // strand an unfiled milestone, never a set entry pointing at nothing.
      yield* Database.flush();
      addMilestoneToSet(taskSet, milestone);
      yield* Database.flush();
      return { milestone: milestone };
    }),
  ),
);

export default handler;
