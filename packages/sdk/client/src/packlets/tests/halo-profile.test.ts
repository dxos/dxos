//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { afterTest } from '@dxos/testutils';

import { Client } from '../client';
import { TestClientBuilder } from '../testing';

describe('HALO', function () {
  it('creates a profile', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createProfile({ displayName: 'test-user' });
    expect(client.halo.profile).exist;
  });
});
