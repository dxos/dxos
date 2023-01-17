//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout } from '@dxos/async';
import { Config } from '@dxos/config';
import { ObjectModel } from '@dxos/object-model';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Spaces', () => {
  test('creates a space', async () => {
    const testBuilder = new TestBuilder();

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

  test('creates a space re-opens the client', async () => {
    const testBuilder = new TestBuilder(new Config({ version: 1 }));
    testBuilder.storage = createStorage({ type: StorageType.RAM });

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });

    let itemId: string;
    {
      // TODO(burdon): API (client.echo/client.halo).
      const space = await client.echo.createSpace();
      const item = await space.database.createItem({ model: ObjectModel });
      await item.model.set('title', 'testing');
      expect(item.model.get('title')).to.eq('testing');
      itemId = item.id;

      const result = await space.queryMembers().waitFor((items) => items.length === 1);
      expect(result).to.have.length(1);
    }

    await client.destroy();
    await client.initialize();

    {
      const result = await client.echo.querySpaces().waitFor((spaces) => spaces.length === 1);
      expect(result).to.have.length(1);
      const space = result[0];

      const item = space.database.getItem(itemId)!;
      expect(item).to.exist;
      expect(item.model.get('title')).to.eq('testing');

      await item.model.set('title', 'testing2');
      expect(item.model.get('title')).to.eq('testing2');
    }

    await client.destroy();
  });
});
