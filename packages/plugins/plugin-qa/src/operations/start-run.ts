//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { QaOperation, TestRun } from '#types';

import { loadCases, loadFeed } from './util';

/**
 * Captures the case keys the run covers onto the run itself. Everything afterwards — the rollup and
 * `pushResult`'s validation — reads that capture rather than the plan, so a plan edited mid-run
 * cannot change what the run was measured against. This is the only point where the plan has a say
 * in a run's coverage.
 */
const handler: Operation.WithHandler<typeof QaOperation.StartRun> = QaOperation.StartRun.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ plan: planRef, cases, target, runner, stages }) {
      const plan = yield* Database.load(planRef);
      const planKeys = (yield* loadCases(plan)).map((testCase) => testCase.key);

      const requested = cases ? [...cases] : planKeys;
      const duplicate = requested.find((key, index) => requested.indexOf(key) !== index);
      if (duplicate !== undefined) {
        // A repeated key would be counted twice by the rollup.
        return yield* Effect.fail(new Error(`Duplicate case key: ${duplicate}.`));
      }
      const unknown = requested.filter((key) => !planKeys.includes(key));
      if (unknown.length > 0) {
        return yield* Effect.fail(new Error(`Not in the plan: ${unknown.join(', ')}.`));
      }

      const run = yield* Database.add(
        TestRun.make({
          plan: Ref.make(plan),
          status: 'running',
          cases: requested,
          target,
          runner,
          stages: stages ? [...stages] : undefined,
          startedAt: new Date().toISOString(),
          results: [],
        }),
      );

      const feed = yield* loadFeed(plan);
      yield* Database.appendToFeed(feed, [run]);

      return { run: Ref.make(run), cases: requested };
    }),
  ),
);

export default handler;
