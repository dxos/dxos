//
// Copyright 2020 DXOS.org
//

import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Config } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { Client } from '../client';
import { TestBuilder } from '../testing';

chai.use(chaiAsPromised);

describe('Client', function () {
  it('creates client with embedded services', async function () {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  it('initialize and destroy multiple times', async function () {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    await client.initialize();
    expect(client.initialized).to.be.true;

    await client.destroy();
    await client.destroy();
    expect(client.initialized).to.be.false;
  });

  it('closes and reopens', async function () {
    const testBuilder = new TestBuilder();

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

  // TODO(burdon): Memory store is reset on close (feed store is closed).
  it.skip('creates identity then resets the memory storage', async function () {
    const config = new Config();
    const testBuilder = new TestBuilder(config);
    await runTest(testBuilder);
  });

  // TODO(burdon): Node only.
  it('creates identity then resets the node storage', async function () {
    if (mochaExecutor.environment !== 'nodejs') {
      this.skip();
    }

    const config = await getNodeConfig(true);
    const testBuilder = new TestBuilder(config);
    await runTest(testBuilder);
  });
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
          path // TODO(burdon): Change to root.
        }
      }
    }
  });
};

// TODO(burdon): Develop test-suite.
const runTest = async (testBuilder: TestBuilder) => {
  const client = new Client({ services: testBuilder.createClientServicesHost() });
  const displayName = 'test-user';

  {
    // Create profile.
    await client.initialize();
    expect(client.halo.profile).not.to.exist;
    const profile = await client.halo.createProfile({ displayName });
    expect(client.halo.profile).to.deep.eq(profile);
    await client.destroy();
  }

  {
    // Should throw trying to create another.
    await client.initialize();
    expect(client.halo.profile).to.exist;
    // TODO(burdon): Error type.
    await expect(client.halo.createProfile({ displayName })).to.be.rejected;
  }

  {
    // Reset storage.
    // TODO(burdon): Reset doesn't work in memory (create store test).
    await client.reset();
  }

  {
    // Start again.
    await client.initialize();
    await client.halo.createProfile({ displayName });
    expect(client.halo.profile).to.exist;
    await client.destroy();
  }
};
