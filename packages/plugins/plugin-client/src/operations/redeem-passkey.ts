//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import * as NativePasskey from '@dxos/app-toolkit/NativePasskey';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { PublicKey } from '@dxos/keys';

import { PasskeyError } from '#types';

import { RedeemPasskey } from './definitions';

/** Signed challenge presented to EDGE in exchange for admitting this device. */
type Assertion = {
  lookupKey: PublicKey;
  signature: Buffer;
  clientDataJson: Buffer;
  authenticatorData: Buffer;
};

const nativeAssertion = (
  challenge: string,
): Effect.Effect<Assertion, PasskeyError.Dismissed | PasskeyError.LoginFailed> =>
  Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: () => NativePasskey.loginNativePasskey({ challenge: Uint8Array.from(Buffer.from(challenge, 'base64')) }),
      catch: PasskeyError.fromAssertion,
    });
    if (!result?.user_handle || !result.signature) {
      return yield* Effect.fail(
        new PasskeyError.LoginFailed({ message: 'Native passkey login returned no assertion.' }),
      );
    }

    return {
      lookupKey: PublicKey.from(NativePasskey.decodeUrlSafeBase64(result.user_handle)),
      signature: Buffer.from(NativePasskey.decodeUrlSafeBase64(result.signature)),
      clientDataJson: Buffer.from(NativePasskey.decodeUrlSafeBase64(result.client_data_json)),
      authenticatorData: Buffer.from(NativePasskey.decodeUrlSafeBase64(result.authenticator_data)),
    };
  });

const webAssertion = (challenge: string): Effect.Effect<Assertion, PasskeyError.Dismissed | PasskeyError.LoginFailed> =>
  Effect.gen(function* () {
    if (typeof PublicKeyCredential === 'undefined') {
      return yield* Effect.fail(
        new PasskeyError.LoginFailed({ message: 'WebAuthn is not available in this browser.' }),
      );
    }

    const credential = yield* Effect.tryPromise({
      try: () =>
        navigator.credentials.get({
          publicKey: {
            challenge: Buffer.from(challenge, 'base64'),
            rpId: NativePasskey.getRelyingPartyId(),
            userVerification: 'required',
          },
        }),
      catch: PasskeyError.fromAssertion,
    });
    // A null credential means the authenticator resolved without presenting one; same signal as a dismissal.
    if (
      !(credential instanceof PublicKeyCredential) ||
      !(credential.response instanceof AuthenticatorAssertionResponse)
    ) {
      return yield* Effect.fail(new PasskeyError.Dismissed({ message: 'No passkey assertion was returned.' }));
    }

    const { signature, clientDataJSON, authenticatorData, userHandle } = credential.response;
    // The user handle carries the lookup key; a passkey created without a resident key has none.
    if (!userHandle) {
      return yield* Effect.fail(new PasskeyError.LoginFailed({ message: 'Passkey assertion has no user handle.' }));
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
      const recoveryChallenge = yield* Effect.mapError(
        Identity.requestRecoveryChallenge,
        PasskeyError.LoginFailed.wrap({ message: 'Failed to request a recovery challenge.' }),
      );

      const assertion = yield* Match.value(NativePasskey.supportsNativePasskeys()).pipe(
        Match.when(true, () => nativeAssertion(recoveryChallenge.challenge)),
        Match.orElse(() => webAssertion(recoveryChallenge.challenge)),
      );

      // EDGE refuses the assertion when the passkey isn't registered as a recovery credential.
      yield* Effect.mapError(
        Identity.recover({
          passkey: { ...assertion, lookupKey: assertion.lookupKey.toHex(), challenge: recoveryChallenge },
        }),
        PasskeyError.Rejected.wrap(),
      );
    }),
  ),
);

export default handler;
