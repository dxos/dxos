//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Capability } from '@dxos/app-framework';
import { decodeUrlSafeBase64, supportsNativePasskeys, loginNativePasskey } from '@dxos/app-toolkit';
import { PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { ClientCapabilities } from '../types';
import { RedeemPasskey } from './definitions';

const handler: Operation.WithHandler<typeof RedeemPasskey> = RedeemPasskey.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      invariant(client.services.services.IdentityService, 'IdentityService not available');
      const { deviceKey, controlFeedKey, challenge } = yield* Effect.promise(() =>
        client.services.services.IdentityService!.requestRecoveryChallenge(),
      );

      const { lookupKey, signature, clientDataJson, authenticatorData } = yield* Match.value(
        supportsNativePasskeys(),
      ).pipe(
        Match.when(true, () =>
          Effect.gen(function* () {
            const result = yield* Effect.promise(() =>
              loginNativePasskey({ challenge: Uint8Array.from(Buffer.from(challenge, 'base64')) }),
            );
            invariant(result, 'Native passkey login returned no result');
            return {
              lookupKey: PublicKey.from(decodeUrlSafeBase64(result.user_handle)),
              signature: Buffer.from(decodeUrlSafeBase64(result.signature)),
              clientDataJson: Buffer.from(decodeUrlSafeBase64(result.client_data_json)),
              authenticatorData: Buffer.from(decodeUrlSafeBase64(result.authenticator_data)),
            };
          }),
        ),
        Match.orElse(() =>
          Effect.gen(function* () {
            const credential = yield* Effect.promise(() =>
              navigator.credentials.get({
                publicKey: {
                  challenge: Buffer.from(challenge, 'base64'),
                  rpId: location.hostname,
                  userVerification: 'required',
                },
              }),
            );
            return {
              lookupKey: PublicKey.from(new Uint8Array((credential as any).response.userHandle)),
              signature: Buffer.from((credential as any).response.signature),
              clientDataJson: Buffer.from((credential as any).response.clientDataJSON),
              authenticatorData: Buffer.from((credential as any).response.authenticatorData),
            };
          }),
        ),
      );

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
