//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import * as CodeOperation from '../types/CodeOperation';

const handler: Operation.WithHandler<typeof CodeOperation.RunBuildAgent> = CodeOperation.RunBuildAgent.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return { status: 'queued' as const };
    }),
  ),
);

export default handler;
