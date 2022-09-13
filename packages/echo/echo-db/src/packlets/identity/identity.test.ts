//
// Copyright 2022 DXOS.org
//

import { it } from 'mocha';

import { Keyring } from '@dxos/keyring';
import { createStorage } from '@dxos/random-access-storage';

describe('Identity', () => {
  it('Sanity', async () => {
    const rootDir = createStorage().createDirectory();
    const keyring = new Keyring(rootDir);
    expect(keyring).toBeDefined();

    // const createIdentity = () => {
    //   const { publicKey: identityKey } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    //   const identity = new Identity({});
    // };
    //
    // const constructIdentity = () => {};
  });
});
