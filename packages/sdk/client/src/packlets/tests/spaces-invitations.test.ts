//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';

import { Client } from '../client';
import { TestClientBuilder } from '../testing';

describe('Spaces/invitations', function () {
  it('creates a space and invites a peer', async function () {
    const testBuilder = new TestClientBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client.destroy());
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });

    {
      const space = await client.echo.createSpace();
      const item = await space.database.createItem({ model: ObjectModel });
      await item.model.set('title', 'testing');
      expect(item.model.get('title')).to.eq('testing');
    }
  });
});
