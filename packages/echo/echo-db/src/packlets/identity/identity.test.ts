//
// Copyright 2022 DXOS.org
//

import { it } from 'mocha';

import { Keyring, KeyType } from '@dxos/keyring';

import { Identity } from './identity';

describe('Identity', () => {
  it('Sanity', async () => {
    const keyring = new Keyring();

    const createIdentity = () => {
      const { publicKey: identityKey } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const identity = new Identity({});
    };

    const constructIdentity = () => {

    };

    expect(identity).toBeDefined();
  });
});
