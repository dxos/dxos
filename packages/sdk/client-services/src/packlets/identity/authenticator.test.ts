//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import expect from 'expect';

import { createCredentialSignerWithKey } from '@dxos/credentials';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { describe, test } from '@dxos/test';
import { ComplexSet } from '@dxos/util';

import { createHaloAuthProvider, createHaloAuthVerifier } from './authenticator';

describe('identity/authenticator', () => {
  test('verifies credentials', async () => {
    const keyring = new Keyring();
    const deviceKey = await keyring.createKey();
    const signer = createCredentialSignerWithKey(keyring, deviceKey);
    const authProvider = createHaloAuthProvider(signer);
    const authVerifier = createHaloAuthVerifier(() => new ComplexSet(PublicKey.hash, [deviceKey]));

    const nonce = new Uint8Array([2, 1, 3, 7]);
    const credential = await authProvider(nonce);
    assert(credential);
    expect(await authVerifier(nonce, credential)).toBeTruthy();
  }).onlyEnvironments('nodejs');
});
