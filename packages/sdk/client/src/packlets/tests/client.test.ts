//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { Client } from '../client';
import { TestClientBuilder } from '../testing';

describe('Client', function () {
  it('initialize and destroy multiple times', async function () {
    const client = new Client();
    await client.initialize();
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  it('closes and reopens', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    expect(client.initialized).to.be.false;

    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  it('reopens with the same identity', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    await client.halo.createProfile();
    const identityKey = client.halo.profile?.identityKey;
    expect(identityKey).to.not.be.undefined;

    await client.destroy();
    await client.initialize();
    expect(client.halo.profile?.identityKey).to.deep.eq(identityKey);
  });

  it('removes identity when reset', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    await client.halo.createProfile();
    const identityKey = client.halo.profile?.identityKey;
    expect(identityKey).to.not.be.undefined;

    await client.reset();
    await client.halo.createProfile();
    expect(identityKey).to.not.be.undefined;
    expect(client.halo.profile?.identityKey).to.not.eq(identityKey);
  });
});
