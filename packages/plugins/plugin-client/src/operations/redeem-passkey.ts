//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Capability } from '@dxos/app-framework';
import { NativePasskey } from '@dxos/app-toolkit';
import { PublicKey } from '@dxos/client';
import * as Operation from '@dxos/compute/Operation';
import { invariant } from '@dxos/invariant';

import { ClientCapabilities } from '../types';
import { RedeemPasskey } from './definitions';
import { PasskeyDismissedError, PasskeyLoginError, PasskeyRejectedError, toPasskeyAssertionError } from './errors';

/** Signed challenge presented to EDGE in exchange for admitting this device. */
type Assertion = {
  lookupKey: PublicKey;
  signature: Buffer;
  clientDataJson: Buffer;
  authenticatorData: Buffer;
};

const nativeAssertion = (challenge: string): Effect.Effect<Assertion, PasskeyDismissedError | PasskeyLoginError> =>
  Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: () => NativePasskey.loginNativePasskey({ challenge: Uint8Array.from(Buffer.from(challenge, 'base64')) }),
      catch: toPasskeyAssertionError,
    });
    if (!result?.user_handle || !result.signature) {
      return yield* Effect.fail(new PasskeyLoginError({ message: 'Native passkey login returned no assertion.' }));
    }

    return {
      lookupKey: PublicKey.from(NativePasskey.decodeUrlSafeBase64(result.user_handle)),
      signature: Buffer.from(NativePasskey.decodeUrlSafeBase64(result.signature)),
      clientDataJson: Buffer.from(NativePasskey.decodeUrlSafeBase64(result.client_data_json)),
      authenticatorData: Buffer.from(NativePasskey.decodeUrlSafeBase64(result.authenticator_data)),
    };
  });

const webAssertion = (challenge: string): Effect.Effect<Assertion, PasskeyDismissedError | PasskeyLoginError> =>
  Effect.gen(function* () {
    if (typeof PublicKeyCredential === 'undefined') {
      return yield* Effect.fail(new PasskeyLoginError({ message: 'WebAuthn is not available in this browser.' }));
    }

    const credential = yield* Effect.tryPromise({
      try: () =>
        navigator.credentials.get({
          publicKey: {
            challenge: Buffer.from(challenge, 'base64'),
            rpId: location.hostname,
            userVerification: 'required',
          },
        }),
      catch: toPasskeyAssertionError,
    });
    // A null credential means the authenticator resolved without presenting one; same signal as a dismissal.
    if (
      !(credential instanceof PublicKeyCredential) ||
      !(credential.response instanceof AuthenticatorAssertionResponse)
    ) {
      return yield* Effect.fail(new PasskeyDismissedError({ message: 'No passkey assertion was returned.' }));
    }

    const { signature, clientDataJSON, authenticatorData, userHandle } = credential.response;
    // The user handle carries the lookup key; a passkey created without a resident key has none.
    if (!userHandle) {
      return yield* Effect.fail(new PasskeyLoginError({ message: 'Passkey assertion has no user handle.' }));
    }

    return {
      lookupKey: PublicKey.from(new Uint8Array(userHandle)),
      signature: Buffer.from(signature),
      clientDataJson: Buffer.from(clientDataJSON),
      authenticatorData: Buffer.from(authenticatorData),
    };
  });

const handler: Operation.WithHandler<typeof RedeemPasskey> = RedeemPasskey.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const identityService = client.services.services.IdentityService;
      invariant(identityService, 'IdentityService not available');

      const { deviceKey, controlFeedKey, challenge } = yield* Effect.tryPromise({
        try: () => identityService.requestRecoveryChallenge(),
        catch: PasskeyLoginError.wrap({ message: 'Failed to request a recovery challenge.' }),
      });

      const assertion = yield* Match.value(NativePasskey.supportsNativePasskeys()).pipe(
        Match.when(true, () => nativeAssertion(challenge)),
        Match.orElse(() => webAssertion(challenge)),
      );

      // EDGE refuses the assertion when the passkey isn't registered as a recovery credential.
      yield* Effect.tryPromise({
        try: () =>
          identityService.recoverIdentity(
            { external: { ...assertion, deviceKey, controlFeedKey } },
            { timeout: RECOVER_IDENTITY_RPC_TIMEOUT },
          ),
        catch: PasskeyRejectedError.wrap(),
      });
    }),
  ),
);

export default handler;

const RECOVER_IDENTITY_RPC_TIMEOUT = 20_000;
