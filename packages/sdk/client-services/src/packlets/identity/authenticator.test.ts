//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import assert from 'node:assert';

import { Event } from '@dxos/async';
import { createCredentialSignerWithKey } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { ComplexSet } from '@dxos/util';

import { createAuthProvider, TrustedKeySetAuthVerifier } from './authenticator';

describe('identity/authenticator', () => {
  test('verifies credentials', async () => {
    const keyring = new Keyring();
    const deviceKey = await keyring.createKey();
    const signer = createCredentialSignerWithKey(keyring, deviceKey);
    const authProvider = createAuthProvider(signer);
    const authVerifier = new TrustedKeySetAuthVerifier({
      trustedKeysProvider: () => new ComplexSet(PublicKey.hash, [deviceKey]),
      update: new Event(),
      authTimeout: 10
    });

    const nonce = new Uint8Array([2, 1, 3, 7]);
    const credential = await authProvider(nonce);
    assert(credential);
    expect(await authVerifier.verifier(nonce, credential)).toBeTruthy();
  }).onlyEnvironments('nodejs');
});
