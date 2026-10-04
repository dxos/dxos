//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { SandboxOperation } from '#types';

import { mintAccountToken } from './account-token.ts';

export default SandboxOperation.GrantAccountAccess.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ sandbox }) {
      const loaded = yield* Database.load(sandbox);
      const env = yield* mintAccountToken(loaded).pipe(Effect.orDie);
      return { env };
    }),
  ),
);
