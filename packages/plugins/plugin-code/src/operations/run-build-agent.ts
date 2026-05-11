//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { CodeOperation } from '../types';

import { Operation } from '@dxos/compute';


const handler: Operation.WithHandler<typeof CodeOperation.RunBuildAgent> = CodeOperation.RunBuildAgent.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return { status: 'queued' as const };
    }),
  ),
);

export default handler;
