//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { TriggerOperation } from '#types';

import { triggerRegistry } from '../triggers.ts';

const handler: Operation.WithHandler<typeof TriggerOperation.CancelTrigger> = TriggerOperation.CancelTrigger.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ trigger: id, dropGoal }) {
      const trigger = triggerRegistry.get(id);
      if (!trigger || !triggerRegistry.remove(id)) {
        return { cancelled: false };
      }
      if (dropGoal && trigger.goal) {
        const goal = yield* Database.load(trigger.goal);
        Obj.update(goal, (goal) => {
          goal.status = 'dropped';
        });
        yield* Database.flush();
      }
      return { cancelled: true };
    }),
  ),
);

export default handler;
