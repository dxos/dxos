//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { PublicKey } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { CreatePasskey } from './definitions';

import { ClientCapabilities } from '../types';

export default CreatePasskey.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const client = yield* Capability.get(ClientCapabilities.Client);
      const identity = client.halo.identity.get();
      invariant(identity, 'Identity not available');

      const lookupKey = PublicKey.random();
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
      const recoveryKey = PublicKey.from(new Uint8Array((credential as any).response.getPublicKey()));
      const algorithm = (credential as any).response.getPublicKeyAlgorithm() === -7 ? 'ES256' : 'ED25519';

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
