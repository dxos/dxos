//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';

import { RedeemToken } from './definitions.ts';

const handler: Operation.WithHandler<typeof RedeemToken> = RedeemToken.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      yield* Identity.recover({ token: data.token });
    }),
  ),
);

export default handler;
