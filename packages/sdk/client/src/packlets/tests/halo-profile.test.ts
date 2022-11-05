//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Client } from '../client';

describe('HALO/profile', function () {
  it('creates a profile', async function () {
    const client = new Client();
    await client.initialize();
    await client.halo.createProfile({ username: 'test-user' });
    expect(client.halo.profile).exist;
    await client.destroy();
  });
});
