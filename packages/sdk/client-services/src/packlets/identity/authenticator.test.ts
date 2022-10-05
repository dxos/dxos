//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import expect from 'expect';

import { createCredentialSignerWithKey } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { ComplexSet } from '@dxos/util';

import { createHaloAuthProvider, createHaloAuthVerifier } from './authenticator';

describe('identity/authenticator', function () {
  it('verifies credentials', async function () {
    if (mochaExecutor.environment !== 'nodejs') {
      this.skip();
    }

    const keyring = new Keyring();
    const deviceKey = await keyring.createKey();
    const signer = createCredentialSignerWithKey(keyring, deviceKey);
    const authProvider = createHaloAuthProvider(signer);
    const authVerifier = createHaloAuthVerifier(() => new ComplexSet(key => key.toHex(), [deviceKey]));

    const nonce = new Uint8Array([2, 1, 3, 7]);

    const credential = await authProvider(nonce);
    assert(credential);
    expect(await authVerifier(nonce, credential)).toBeTruthy();
  });
});
