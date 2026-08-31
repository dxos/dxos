//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { QaOperation } from '#types';

import { loadRuns } from './util';

/** One case's outcome across runs — the question a flaky or long-broken case is answered by. */
const handler: Operation.WithHandler<typeof QaOperation.GetCaseHistory> = QaOperation.GetCaseHistory.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ plan: planRef, caseKey, limit }) {
      const plan = yield* Database.load(planRef);
      const runs = yield* loadRuns(plan);
      const entries = runs
        .flatMap((run) => {
          const result = run.results.find((candidate) => candidate.caseKey === caseKey);
          return result
            ? [
                {
                  run: Ref.make(run),
                  status: result.status,
                  target: run.target,
                  at: run.finishedAt ?? run.startedAt,
                },
              ]
            : [];
        })
        .slice(0, limit ?? Number.MAX_SAFE_INTEGER);

      return { entries };
    }),
  ),
);

export default handler;
