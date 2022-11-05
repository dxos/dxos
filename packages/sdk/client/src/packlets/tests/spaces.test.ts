//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { ObjectModel } from '@dxos/object-model';

import { Client } from '../client';

describe('Spaces', function () {
  it('creates a space', async function () {
    const client = new Client();
    await client.initialize();
    await client.halo.createProfile({ username: 'test-user' });

    {
      // TODO(burdon): Test basic queries.
      const party = await client.echo.createParty();
      const item = await party.database.createItem({ model: ObjectModel });
      await item.model.set('title', 'testing');
      expect(item.model.get('title')).to.eq('testing');
    }

    await client.destroy();
  });
});
