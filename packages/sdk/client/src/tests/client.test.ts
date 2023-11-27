//
// Copyright 2020 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { rmSync } from 'node:fs';

import { Config } from '@dxos/config';
import { describe, test, afterTest } from '@dxos/test';
import { isNode } from '@dxos/util';

import { Client } from '../client';
import { TestBuilder } from '../testing';

chai.use(chaiAsPromised);

describe('Client', () => {
  const dataRoot = '/tmp/dxos/client/storage';

  afterEach(async () => {
    // Clean up.
    isNode() && rmSync(dataRoot, { recursive: true, force: true });
  });

  test('creates client with embedded services', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('initialize and destroy multiple times', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  test('closes and reopens', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    expect(client.initialized).to.be.false;

    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  test('create space before identity', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    afterTest(() => client.destroy());
    await expect(client.spaces.create()).to.eventually.be.rejectedWith('This device has no HALO identity available.');
  }).timeout(1_000);

  test('creates identity then resets', async () => {
    const config = new Config({
      version: 1,
      runtime: {
        client: {
          storage: { persistent: true, dataRoot },
        },
      },
    });
    const testBuilder = new TestBuilder(config);
    const client = new Client({ services: testBuilder.createLocal() });
    const displayName = 'test-user';
    {
      // Create identity.
      await client.initialize();
      expect(client.halo.identity.get()).not.to.exist;
      const identity = await client.halo.createIdentity({ displayName });
      expect(client.halo.identity.get()).to.deep.eq(identity);
      await client.destroy();
    }

    {
      // Should throw trying to create another.
      await client.initialize();
      expect(client.halo.identity).to.exist;
      // TODO(burdon): Error type.
      await expect(client.halo.createIdentity({ displayName })).to.be.rejected;
    }

    {
      // Reset storage.
      await client.reset();
    }

    {
      // Start again.
      expect(client.halo.identity.get()).to.eq(null);
      await client.halo.createIdentity({ displayName });
      expect(client.halo.identity).to.exist;
      await client.destroy();
    }
  }).onlyEnvironments('nodejs', 'chromium', 'firefox');
});
