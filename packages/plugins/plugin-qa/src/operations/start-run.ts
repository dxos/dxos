//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Ref } from '@dxos/echo';

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
      const planCases = yield* loadCases(plan);
      const byKey = new Map(planCases.map((testCase) => [testCase.key, testCase]));

      const requestedKeys = cases ? [...cases] : planCases.map((testCase) => testCase.key);
      const duplicate = requestedKeys.find((key, index) => requestedKeys.indexOf(key) !== index);
      if (duplicate !== undefined) {
        // A repeated key would be counted twice by the rollup.
        return yield* Effect.fail(new Error(`Duplicate case key: ${duplicate}.`));
      }

      // Capture identity, not just the key: pushResult resolves the case from here, so a
      // removeCase mid-run cannot strand a result for a case the rollup still counts.
      const captured: TestRun.CapturedCase[] = [];
      for (const key of requestedKeys) {
        const testCase = byKey.get(key);
        if (!testCase) {
          return yield* Effect.fail(new Error(`Not in the plan: ${key}.`));
        }
        captured.push({ key, case: Ref.make(testCase) });
      }

      // The run belongs to the feed, so it is appended rather than added: `Database.add` would give
      // it an identity the feed then refuses to assign a position to.
      const run = TestRun.make({
        plan: Ref.make(plan),
        status: 'running',
        cases: captured,
        target,
        runner,
        stages: stages ? [...stages] : undefined,
        startedAt: new Date().toISOString(),
        results: [],
      });
      const feed = yield* loadFeed(plan);
      yield* Feed.append(feed, [run]);

      return { run: Ref.make(run), cases: requestedKeys };
    }),
  ),
);

export default handler;
