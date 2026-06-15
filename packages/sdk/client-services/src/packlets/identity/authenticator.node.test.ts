//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Event } from '@dxos/async';
import { createCredentialSignerWithKey } from '@dxos/credentials';
import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { ComplexSet } from '@dxos/util';

import { TrustedKeySetAuthVerifier, createAuthProvider } from './authenticator';

describe('identity/authenticator', () => {
  test('verifies credentials', async () => {
    const keyring = new Keyring();
    const deviceKey = await keyring.createKey();
    const signer = createCredentialSignerWithKey(keyring, deviceKey);
    const authProvider = createAuthProvider(signer);
    const authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () => new ComplexSet(PublicKey.hash, [deviceKey]),
      update: new Event(),
      authTimeout: 10,
    });

    const nonce = new Uint8Array([2, 1, 3, 7]);
    const credential = await authProvider(nonce);
    invariant(credential);
    expect(await authVerifier.verifier(nonce, credential)).toBeTruthy();
  });
});
