//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { VerifySpec } from './definitions';

const handler: Operation.WithHandler<typeof VerifySpec> = VerifySpec.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return { ok: true, messages: [] as string[] };
    }),
  ),
);

export default handler;
