//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

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

    // TODO(burdon): Test basic queries.
    {
      const party = await client.echo.createParty();
      const item = await party.database.createItem({ model: ObjectModel });
      await item.model.set('title', 'testing');
      expect(item.model.get('title')).to.eq('testing');
    }
  });
});
