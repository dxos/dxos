//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { RedeemPasskey } from './definitions';
import { supportsNativePasskeys, loginNativePasskey } from './util';

import { ClientCapabilities } from '../types';

const handler: Operation.WithHandler<typeof RedeemPasskey> = RedeemPasskey.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      invariant(client.services.services.IdentityService, 'IdentityService not available');
      const { deviceKey, controlFeedKey, challenge } = yield* Effect.promise(() =>
        client.services.services.IdentityService!.requestRecoveryChallenge(),
      );

      let lookupKey: PublicKey;
      let signature: Buffer;
      let clientDataJson: Buffer;
      let authenticatorData: Buffer;

      if (supportsNativePasskeys()) {
        const result = yield* Effect.promise(() =>
          loginNativePasskey({ challenge: Uint8Array.from(Buffer.from(challenge, 'base64')) }),
        );
        lookupKey = PublicKey.from(Uint8Array.from(atob(result.user_handle), (c) => c.charCodeAt(0)));
        signature = Buffer.from(atob(result.signature), 'latin1');
        clientDataJson = Buffer.from(atob(result.client_data_json), 'latin1');
        authenticatorData = Buffer.from(atob(result.authenticator_data), 'latin1');
      } else {
        const credential = yield* Effect.promise(() =>
          navigator.credentials.get({
            publicKey: {
              challenge: Buffer.from(challenge, 'base64'),
              rpId: location.hostname,
              userVerification: 'required',
            },
          }),
        );
        lookupKey = PublicKey.from(new Uint8Array((credential as any).response.userHandle));
        signature = Buffer.from((credential as any).response.signature);
        clientDataJson = Buffer.from((credential as any).response.clientDataJSON);
        authenticatorData = Buffer.from((credential as any).response.authenticatorData);
      }

      yield* Effect.promise(() =>
        client.services.services.IdentityService!.recoverIdentity(
          {
            external: {
              lookupKey,
              deviceKey,
              controlFeedKey,
              signature,
              clientDataJson,
              authenticatorData,
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
