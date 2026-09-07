//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { QaOperation, TestRun } from '#types';

/**
 * Seals the run. The rollup runs over the captured cases rather than the reported results, so a run
 * that covered nothing, or reported nothing, cannot seal as `passed`.
 */
const handler: Operation.WithHandler<typeof QaOperation.CompleteRun> = QaOperation.CompleteRun.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ run: runRef, summary }) {
      const run = yield* Database.load(runRef);
      if (run.status !== 'running') {
        return yield* Effect.fail(new Error('Run is already sealed.'));
      }

      const status = TestRun.rollup(run.cases, run.results);
      const missing = TestRun.unreported(run);
      Obj.update(run, (run) => {
        run.status = status;
        run.finishedAt = new Date().toISOString();
        run.summary = summary;
      });

      return { run: Ref.make(run), status, unreported: missing };
    }),
  ),
);

export default handler;
