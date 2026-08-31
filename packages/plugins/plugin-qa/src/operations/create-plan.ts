//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';

import { QaOperation, TestPlan } from '#types';

/**
 * A factory: it creates the plan in the target database but places nothing. The caller decides
 * where the plan lives, via `space.addObject`. The feed rides along as a child of the plan.
 */
const handler: Operation.WithHandler<typeof QaOperation.CreatePlan> = QaOperation.CreatePlan.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ name, description, source, target }) {
      const plan = target.add(TestPlan.make({ name, description, source }));
      return { plan: Ref.make(plan) };
    }),
  ),
);

export default handler;
