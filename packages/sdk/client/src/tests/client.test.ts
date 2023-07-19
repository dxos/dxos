//
// Copyright 2020 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Config } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';

chai.use(chaiAsPromised);

describe('Client', () => {
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
    await expect(client.createSpace()).to.eventually.be.rejectedWith('This device has no HALO identity available.');
  }).timeout(1_000);

  // TODO(burdon): Memory store is reset on close (feed store is closed).
  test.skip('creates identity then resets the memory storage', async () => {
    const config = new Config();
    const testBuilder = new TestBuilder(config);
    await runTest(testBuilder);
  });

  test('creates identity then resets the node storage', async () => {
    const config = await getNodeConfig(true);
    const testBuilder = new TestBuilder(config);
    await runTest(testBuilder);
  }).onlyEnvironments('nodejs');
});

// TODO(burdon): Factor out.
const getNodeConfig = async (reset = false) => {
  const path = '/tmp/dxos/client/test/packlets/test';
  if (reset) {
    // TODO(burdon): Reconcile StorageType and ConfigProto types.
    const storage = createStorage({ type: StorageType.NODE, root: path });
    await storage.reset();
  }

  // TODO(burdon): Update API.
  // TODO(burdon): Config not required if remote.
  return new Config({
    version: 1,
    runtime: {
      client: {
        storage: {
          persistent: true,
          storageType: Runtime.Client.Storage.StorageDriver.NODE,
          path, // TODO(burdon): Change to root.
        },
      },
    },
  });
};

// TODO(burdon): Develop test-suite.
const runTest = async (testBuilder: TestBuilder) => {
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
    // TODO(burdon): Reset doesn't work in memory (create store test).
    await client.reset();
  }

  {
    // Start again.
    await client.initialize();
    await client.halo.createIdentity({ displayName });
    expect(client.halo.identity).to.exist;
    await client.destroy();
  }
};
