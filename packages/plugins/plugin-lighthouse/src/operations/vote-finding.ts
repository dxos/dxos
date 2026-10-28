//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { LighthouseOperation } from '#types';

import { loadClient, requireRun } from './util.ts';

const handler: Operation.WithHandler<typeof LighthouseOperation.VoteFinding> = LighthouseOperation.VoteFinding.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ research: researchRef, iri, vote }) {
      const research = yield* Database.load(researchRef);
      const run = yield* requireRun(research);
      const client = yield* loadClient(research);
      yield* client.sendFeedback(run, iri, vote);
    }),
  ),
);

export default handler;
