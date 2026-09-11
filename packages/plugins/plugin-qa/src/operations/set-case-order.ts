//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { QaOperation, type TestCase } from '#types';

import { loadCases } from './util.ts';

const handler: Operation.WithHandler<typeof QaOperation.SetCaseOrder> = QaOperation.SetCaseOrder.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ plan: planRef, keys }) {
      const plan = yield* Database.load(planRef);
      const cases = yield* loadCases(plan);
      const byKey = new Map(cases.map((testCase) => [testCase.key, testCase]));

      // A repeat would store the same case twice and drop another, so the ordering is a permutation.
      const duplicate = keys.find((key, index) => keys.indexOf(key) !== index);
      if (duplicate !== undefined) {
        return yield* Effect.fail(new Error(`Duplicate case key: ${duplicate}.`));
      }
      // A partial ordering would silently drop the cases it omits, so the ordering must name them all.
      if (keys.length !== cases.length) {
        return yield* Effect.fail(new Error(`Ordering names ${keys.length} of ${cases.length} cases.`));
      }

      const ordered: Ref.Ref<TestCase.TestCase>[] = [];
      for (const key of keys) {
        const testCase = byKey.get(key);
        if (!testCase) {
          return yield* Effect.fail(new Error(`Not in the plan: ${key}.`));
        }
        ordered.push(Ref.make(testCase));
      }

      Obj.update(plan, (plan) => {
        plan.cases = ordered;
      });

      return { plan: Ref.make(plan) };
    }),
  ),
);

export default handler;
