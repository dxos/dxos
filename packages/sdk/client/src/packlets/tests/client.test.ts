//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { Client } from '../client';
import { TestClientBuilder } from '../testing';

describe('Client', function () {
  it('initialize and destroy multiple times', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
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
});
