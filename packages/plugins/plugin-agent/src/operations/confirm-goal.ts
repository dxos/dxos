//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { MemoryOperation } from '#types';

const handler: Operation.WithHandler<typeof MemoryOperation.ConfirmGoal> = MemoryOperation.ConfirmGoal.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ goal: goalRef, status = 'confirmed' }) {
      const goal = yield* Database.load(goalRef);
      Obj.update(goal, (goal) => {
        goal.status = status;
      });
      return { goal: goalRef };
    }),
  ),
);

export default handler;
