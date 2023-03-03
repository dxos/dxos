//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Config } from '@dxos/config';
import { log } from '@dxos/log';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder, testSpace } from '../testing';

describe('Spaces', () => {
  test('creates a space', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client.destroy());

    await client.initialize();
    await client.halo.createIdentity({ displayName: 'test-user' });

    // TODO(burdon): Extend basic queries.
    const space = await client.echo.createSpace();
    await testSpace(space.internal.db);

    expect(space.getMembers()).to.be.length(1);
  });

  test('creates a space re-opens the client', async () => {
    const testBuilder = new TestBuilder(new Config({ version: 1 }));
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createLocal() });
    await client.initialize();
    await client.halo.createIdentity({ displayName: 'test-user' });

    let itemId: string;
    {
      // TODO(burdon): API (client.echo/client.halo).
      const space = await client.echo.createSpace();
      const {
        objectsCreated: [item]
      } = await testSpace(space.internal.db);
      itemId = item.id;
      expect(space.getMembers()).to.be.length(1);
    }

    await client.destroy();

    log.break();

    await client.initialize();

    {
      const result = client.echo.getSpaces();
      expect(result).to.have.length(1);
      const space = result[0];

      const item = space.internal.db._itemManager.getItem(itemId)!;
      expect(item).to.exist;
    }

    await client.destroy();
  });
});
