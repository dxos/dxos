//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';

import { QaOperation } from '#types';

import { loadRuns } from './util.ts';

const handler: Operation.WithHandler<typeof QaOperation.QueryRuns> = QaOperation.QueryRuns.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ plan: planRef, limit, status, caseKey }) {
      const plan = yield* Database.load(planRef);
      const runs = (yield* loadRuns(plan))
        .filter((run) => (status ? run.status === status : true))
        .filter((run) => (caseKey ? run.results.some((result) => result.caseKey === caseKey) : true))
        .slice(0, limit ?? Number.MAX_SAFE_INTEGER);

      return { runs: runs.map((run) => Ref.make(run)) };
    }),
  ),
);

export default handler;
