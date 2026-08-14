//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';
import * as Option from 'effect/Option';

import * as NativePasskey from '@dxos/app-toolkit/NativePasskey';
import * as Operation from '@dxos/compute/Operation';
import { Identity } from '@dxos/halo';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { getHostPlatform } from '@dxos/util';

import { CreatePasskey } from './definitions';

/**
 * Best-effort name for a newly created passkey, so the list is not a column of identical dates.
 * The authenticator never tells us which it is, so the platform is the only distinguishing thing
 * available at creation time; the user can rename it on the account page.
 */
const PLATFORM_NAMES: Partial<Record<ReturnType<typeof getHostPlatform>, string>> = {
  macos: 'macOS',
  windows: 'Windows',
  ios: 'iOS',
  linux: 'Linux',
};

const defaultPasskeyLabel = (): string => {
  const platform = PLATFORM_NAMES[getHostPlatform()];
  return platform ? `Passkey on ${platform}` : 'Passkey';
};

const handler: Operation.WithHandler<typeof CreatePasskey> = CreatePasskey.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const identity = Option.getOrUndefined(yield* Identity.getSnapshot);
      invariant(identity, 'Identity not available');

      const lookupKey = PublicKey.random();

      const { recoveryKey, algorithm } = yield* Match.value(NativePasskey.supportsNativePasskeys()).pipe(
        Match.when(true, () =>
          Effect.gen(function* () {
            const result = yield* Effect.promise(() =>
              NativePasskey.createNativePasskey({
                username: identity.did,
                userId: lookupKey.asUint8Array(),
              }),
            );
            const { publicKey, algorithm: alg } = NativePasskey.extractPublicKeyFromAttestation(
              result.attestation_object,
            );
            return {
              recoveryKey: PublicKey.from(publicKey),
              algorithm: alg === -7 ? 'ES256' : 'ED25519',
            };
          }),
        ),
        Match.orElse(() =>
          Effect.gen(function* () {
            const credential = yield* Effect.promise(() =>
              navigator.credentials.create({
                publicKey: {
                  challenge: new Uint8Array(),
                  rp: { id: NativePasskey.getRelyingPartyId(), name: 'Composer' },
                  user: {
                    id: lookupKey.asUint8Array() as Uint8Array<ArrayBuffer>,
                    name: identity.did,
                    displayName: identity.displayName ?? '',
                  },
                  pubKeyCredParams: [
                    { type: 'public-key', alg: -8 },
                    { type: 'public-key', alg: -7 },
                  ],
                  authenticatorSelection: {
                    residentKey: 'required',
                    requireResidentKey: true,
                  },
                },
              }),
            );
            invariant(credential, 'Credential not available');
            return {
              recoveryKey: PublicKey.from(new Uint8Array((credential as any).response.getPublicKey())),
              algorithm: (credential as any).response.getPublicKeyAlgorithm() === -7 ? 'ES256' : 'ED25519',
            };
          }),
        ),
      );

      yield* Identity.createRecoveryCredential({
        externalKey: {
          recoveryKey: recoveryKey.toHex(),
          lookupKey: lookupKey.toHex(),
          algorithm,
          label: defaultPasskeyLabel(),
          kind: 'passkey',
        },
      });
    }),
  ),
);

export default handler;
