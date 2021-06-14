//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { Keyring } from '@dxos/credentials';

import { Identity } from './identity';

describe('Identity', () => {
  it('can create a new identity without a HALO party', async () => {
    const keyring = new Keyring();
    const identity = await Identity.newIdentity(keyring);

    expect(identity.identityKey).toBeDefined();
    expect(identity.identityGenesis).toBeDefined();
    expect(identity.identityInfo).toBeDefined();
    expect(identity.displayName).toBeDefined();
    expect(identity.deviceKey).toBeDefined();
    expect(identity.deviceKeyChain).toBeDefined();
    expect(identity.halo).toBeUndefined();
  });
});
