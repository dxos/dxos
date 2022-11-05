//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';

import { Client } from '../client';

describe('Client', function () {
  // TODO(burdon): Configure MemorySignalManager.
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
    const client = new Client();
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
