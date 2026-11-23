//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { LighthouseOperation } from '#types';

import { loadClient, requireRun } from './util.ts';

const handler: Operation.WithHandler<typeof LighthouseOperation.ExtendFinding> = LighthouseOperation.ExtendFinding.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ research: researchRef, iri, extension, deep }) {
      const research = yield* Database.load(researchRef);
      const run = yield* requireRun(research);
      const client = yield* loadClient(research);
      return yield* client.extend(run, { subject: iri, extension, ...(deep ? { deep } : {}) });
    }),
  ),
);

export default handler;
