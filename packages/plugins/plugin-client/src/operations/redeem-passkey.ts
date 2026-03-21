//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { RedeemPasskey } from './definitions';

import { ClientCapabilities } from '../types';

const handler: Operation.WithHandler<typeof RedeemPasskey> = RedeemPasskey.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      invariant(client.services.services.IdentityService, 'IdentityService not available');
      const { deviceKey, controlFeedKey, challenge } = yield* Effect.promise(() =>
        client.services.services.IdentityService!.requestRecoveryChallenge(),
      );
      const credential = yield* Effect.promise(() =>
        navigator.credentials.get({
          publicKey: {
            challenge: Buffer.from(challenge, 'base64'),
            rpId: location.hostname,
            userVerification: 'required',
          },
        }),
      );
      const lookupKey = PublicKey.from(new Uint8Array((credential as any).response.userHandle));
      yield* Effect.promise(() =>
        client.services.services.IdentityService!.recoverIdentity(
          {
            external: {
              lookupKey,
              deviceKey,
              controlFeedKey,
              signature: Buffer.from((credential as any).response.signature),
              clientDataJson: Buffer.from((credential as any).response.clientDataJSON),
              authenticatorData: Buffer.from((credential as any).response.authenticatorData),
            },
          },
          { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
        ),
      );
    }),
  ),
);

export default handler;

const RECOVER_IDENTITY_RPC_TIMEOUT = 20_000;
