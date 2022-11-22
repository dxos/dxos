//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import fs from 'fs/promises';

import { Config } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { afterTest } from '@dxos/testutils';

import { Client } from '../client';
import { TestClientBuilder } from '../testing';

describe('Client', function () {
  it('creates client with embedded services', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

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

  // TODO(burdon): Node only.
  it.only('creates a space then resets the client storage', async function () {
    const path = '/tmp/dxos/client/test/packlets/test';
    await fs.rm(path, { recursive: true, force: true });

    // TODO(burdon): Config not required if remote.
    const testBuilder = new TestClientBuilder(
      new Config({
        version: 1,
        runtime: {
          client: {
            storage: {
              persistent: true, // TODO(burdon): Update API.
              storageType: Runtime.Client.Storage.StorageDriver.NODE,
              path
            }
          }
        }
      })
    );

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });

    await client.destroy();
    await client.initialize();

    {
      const result = await client.echo.querySpaces().waitFor((spaces) => spaces.length === 1);
      expect(result).to.have.length(1);
    }

    await client.reset();

    await client.initialize();

    {
      // TODO(burdon): Throw API error.
      await client.halo.createProfile({ displayName: 'test-user' });
    }

    await client.destroy();
  });
});
