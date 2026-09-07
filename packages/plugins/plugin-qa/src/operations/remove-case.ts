//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';

import { QaOperation } from '#types';

import { loadCases } from './util';

/**
 * Removes the case from the plan's ordering only. The TestCase object survives, because results in
 * past runs still reference it — and a run started before this still counts the key it captured.
 */
const handler: Operation.WithHandler<typeof QaOperation.RemoveCase> = QaOperation.RemoveCase.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ plan: planRef, key }) {
      const plan = yield* Database.load(planRef);
      const cases = yield* loadCases(plan);
      const index = cases.findIndex((testCase) => testCase.key === key);
      if (index < 0) {
        return { removed: false };
      }

      Obj.update(plan, (plan) => {
        plan.cases = plan.cases.filter((_, position) => position !== index);
      });

      return { removed: true };
    }),
  ),
);

export default handler;
