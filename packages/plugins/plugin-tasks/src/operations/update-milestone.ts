//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { TaskOperation } from '#types';

/**
 * A plain field write: nothing here needs more than a generic object update, and it exists because
 * `Milestone` has no other writer.
 */
const handler: Operation.WithHandler<typeof TaskOperation.UpdateMilestone> = TaskOperation.UpdateMilestone.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ milestone: milestoneRef, name, description, targetDate }) {
      const milestone = yield* Database.load(milestoneRef);
      Obj.update(milestone, (milestone) => {
        if (name !== undefined) {
          milestone.name = name;
        }
        if (description !== undefined) {
          milestone.description = description;
        }
        if (targetDate !== undefined) {
          milestone.targetDate = targetDate ?? undefined;
        }
      });
      return { milestone: milestone };
    }),
  ),
);

export default handler;
