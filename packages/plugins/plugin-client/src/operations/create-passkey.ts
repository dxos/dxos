//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Match from 'effect/Match';

import { Capability } from '@dxos/app-framework';
import { supportsNativePasskeys, createNativePasskey, extractPublicKeyFromAttestation } from '@dxos/app-toolkit';
import { PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { CreatePasskey } from './definitions';

import { ClientCapabilities } from '../types';

const handler: Operation.WithHandler<typeof CreatePasskey> = CreatePasskey.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const identity = client.halo.identity.get();
      invariant(identity, 'Identity not available');

      const lookupKey = PublicKey.random();

      const { recoveryKey, algorithm } = yield* Match.value(supportsNativePasskeys()).pipe(
        Match.when(true, () =>
          Effect.gen(function* () {
            const result = yield* Effect.promise(() =>
              createNativePasskey({
                username: identity.did,
                userId: lookupKey.asUint8Array(),
              }),
            );
            const { publicKey, algorithm: alg } = extractPublicKeyFromAttestation(result.attestation_object);
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
                  rp: { id: location.hostname, name: 'Composer' },
                  user: {
                    id: lookupKey.asUint8Array() as Uint8Array<ArrayBuffer>,
                    name: identity.did,
                    displayName: identity.profile?.displayName ?? '',
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

      invariant(client.services.services.IdentityService, 'IdentityService not available');
      yield* Effect.promise(() =>
        client.services.services.IdentityService!.createRecoveryCredential({
          data: {
            recoveryKey,
            algorithm,
            lookupKey,
          },
        }),
      );
    }),
  ),
);

export default handler;
