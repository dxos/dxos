//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { QaOperation, TestRun } from '#types';

import { findCase } from './util';

/**
 * Validated against the run's captured `cases`, never against the plan's current membership: a
 * `removeCase` mid-run must not reject a result for a case the rollup still counts as unreported.
 */
const handler: Operation.WithHandler<typeof QaOperation.PushResult> = QaOperation.PushResult.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ run: runRef, caseKey, status, steps, note, durationMs, artifacts }) {
      const run = yield* Database.load(runRef);
      if (run.status !== 'running') {
        return yield* Effect.fail(new Error('Run is already finished; a correction is a new run.'));
      }
      if (!run.cases.includes(caseKey)) {
        return yield* Effect.fail(new Error(`Case ${caseKey} is not in this run's captured cases.`));
      }

      const plan = yield* Database.load(run.plan);
      const testCase = yield* findCase(plan, caseKey);
      if (!testCase) {
        return yield* Effect.fail(new Error(`Case ${caseKey} no longer resolves in the plan.`));
      }

      const result: TestRun.Result = {
        case: Ref.make(testCase),
        caseKey,
        status,
        steps: steps ? [...steps] : undefined,
        note,
        durationMs,
        artifacts: artifacts ? [...artifacts] : undefined,
      };

      Obj.update(run, (run) => {
        // Replace by key rather than append, so a re-push corrects rather than double-counts.
        const index = run.results.findIndex((existing) => existing.caseKey === caseKey);
        run.results =
          index < 0
            ? [...run.results, result]
            : run.results.map((existing, position) => (position === index ? result : existing));
      });

      return { run: Ref.make(run), status: run.status };
    }),
  ),
);

export default handler;
