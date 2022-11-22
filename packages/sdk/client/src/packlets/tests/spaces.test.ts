//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import fs from 'fs';

import { asyncTimeout } from '@dxos/async';
import { Config } from '@dxos/config';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';

import { Client } from '../client';
import { TestClientBuilder } from '../testing';

describe('Spaces', function () {
  it('creates a space', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client.destroy());

    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });

    // TODO(burdon): Extend basic queries.
    const space = await client.echo.createSpace();
    const item = await space.database.createItem({ model: ObjectModel });
    await item.model.set('title', 'testing');
    expect(item.model.get('title')).to.eq('testing');

    await asyncTimeout(
      space.queryMembers().waitFor((items) => items.length === 1),
      500
    );
  });

  it.only('creates a space then resets the client storage', async function () {
    const path = '/tmp/dxos/client/test/packlets/test';
    fs.rmdirSync(path, { recursive: true });

    const testBuilder = new TestClientBuilder(
      new Config({
        version: 1,
        runtime: {
          client: {
            // TODO(burdon): Update API.
            storage: {
              persistent: true,
              // keyStorage: Runtime.Client.Storage.StorageDriver.NODE,
              // storageType: Runtime.Client.Storage.StorageDriver.NODE,
              path
            }
          }
        }
      })
    );

    // TODO(burdon): API Errors (e.g., identity not set).

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });

    {
      // TODO(burdon): API (client.echo/client.halo).
      const space = await client.echo.createSpace();
      const item = await space.database.createItem({ model: ObjectModel });
      await item.model.set('title', 'testing');
      expect(item.model.get('title')).to.eq('testing');

      const result = await space.queryMembers().waitFor((items) => items.length === 1);
      expect(result).to.have.length(1);
    }

    await client.destroy();
    await client.initialize();

    {
      const result = await client.echo.querySpaces().waitFor((spaces) => spaces.length === 1);
      expect(result).to.have.length(1);
    }

    await client.destroy();
  });
});
