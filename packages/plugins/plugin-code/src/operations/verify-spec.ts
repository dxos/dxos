//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { CodeOperation } from '../types';

const handler: Operation.WithHandler<typeof CodeOperation.VerifySpec> = CodeOperation.VerifySpec.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return { ok: true, messages: [] as string[] };
    }),
  ),
);

export default handler;
