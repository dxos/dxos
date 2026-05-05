//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { invariant } from '@dxos/invariant';

import { ClientCapabilities } from '../types';
import { RedeemToken } from './definitions';
import { markRecoveryInProgress } from './recovery-flag';

const handler: Operation.WithHandler<typeof RedeemToken> = RedeemToken.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (data) {
      const client = yield* Capability.get(ClientCapabilities.Client);
      invariant(client.services.services.IdentityService, 'IdentityService not available');
      // Suppress the privacy notice for this session: the user is recovering
      // an existing identity, not creating a new one.
      markRecoveryInProgress();
      yield* Effect.promise(() =>
        client.services.services.IdentityService!.recoverIdentity(
          { token: data.token },
          { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
        ),
      );
    }),
  ),
);

export default handler;

const RECOVER_IDENTITY_RPC_TIMEOUT = 20_000;
