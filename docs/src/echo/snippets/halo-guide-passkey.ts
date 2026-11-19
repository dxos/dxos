//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Identity } from '@dxos/halo';
import { PublicKey } from '@dxos/keys';

/** The site the passkey belongs to: the app's own host. */
const rpId = location.hostname;

// #region register
const registerPasskey = Effect.gen(function* () {
  const identity = Option.getOrThrow(yield* Identity.getSnapshot);

  // The lookup key names the passkey. It goes in the user handle, so the
  // assertion returns it.
  const lookupKey = PublicKey.random();

  const credential = yield* Effect.promise(() =>
    navigator.credentials.create({
      publicKey: {
        challenge: new Uint8Array(32),
        rp: { id: rpId, name: 'Contact book' },
        user: {
          id: new Uint8Array(lookupKey.asUint8Array()),
          name: identity.did,
          displayName: identity.displayName ?? '',
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -8 }, // Ed25519
          { type: 'public-key', alg: -7 }, // ES256
        ],
        authenticatorSelection: { residentKey: 'required' },
      },
    }),
  );
  if (
    !(credential instanceof PublicKeyCredential) ||
    !(credential.response instanceof AuthenticatorAttestationResponse)
  ) {
    return yield* Effect.die('No passkey was created.');
  }

  const response = credential.response;
  const publicKey = response.getPublicKey();
  if (!publicKey) {
    return yield* Effect.die('The authenticator returned no public key.');
  }

  yield* Identity.createRecoveryCredential({
    externalKey: {
      recoveryKey: PublicKey.from(new Uint8Array(publicKey)).toHex(),
      lookupKey: lookupKey.toHex(),
      algorithm: response.getPublicKeyAlgorithm() === -7 ? 'ES256' : 'ED25519',
      label: 'Passkey',
      kind: 'passkey',
    },
  });
});
// #endregion register

// #region recover
const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

const recoverWithPasskey = Effect.gen(function* () {
  const challenge = yield* Identity.requestRecoveryChallenge;

  const credential = yield* Effect.promise(() =>
    navigator.credentials.get({
      publicKey: {
        challenge: fromBase64(challenge.challenge),
        rpId,
        userVerification: 'required',
      },
    }),
  );
  if (
    !(credential instanceof PublicKeyCredential) ||
    !(credential.response instanceof AuthenticatorAssertionResponse)
  ) {
    return yield* Effect.die('No passkey assertion was returned.');
  }

  const response = credential.response;
  // The user handle carries the lookup key the passkey was registered with.
  const userHandle = response.userHandle;
  if (!userHandle) {
    return yield* Effect.die('The passkey has no user handle.');
  }

  return yield* Identity.recover({
    passkey: {
      challenge,
      lookupKey: PublicKey.from(new Uint8Array(userHandle)).toHex(),
      signature: new Uint8Array(response.signature),
      clientDataJson: new Uint8Array(response.clientDataJSON),
      authenticatorData: new Uint8Array(response.authenticatorData),
    },
  });
});
// #endregion recover

// #region revoke
const revokePasskeys = Effect.gen(function* () {
  const [credentials] = yield* Identity.credentials.pipe(
    Stream.take(1),
    Stream.runCollect,
  );
  for (const { recovery } of credentials) {
    if (
      recovery?.kind === 'passkey' &&
      !recovery.revoked &&
      recovery.lookupKey
    ) {
      yield* Identity.revokeRecoveryCredential(recovery.lookupKey);
    }
  }
});
// #endregion revoke

export { recoverWithPasskey, registerPasskey, revokePasskeys };
