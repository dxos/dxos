//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { CodeOperation } from '../types';

const handler: Operation.WithHandler<typeof CodeOperation.VerifySpec> = CodeOperation.VerifySpec.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return { ok: true, messages: [] as string[] };
    }),
  ),
);

export default handler;
