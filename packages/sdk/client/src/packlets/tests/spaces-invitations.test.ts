//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { DocumentModel } from '@dxos/document-model';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder } from '../testing';

describe('Spaces/invitations', () => {
  test('creates a space and invites a peer', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client.destroy());
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });

    {
      const space = await client.echo.createSpace();
      const item = await space.internal.db._itemManager.createItem(DocumentModel.meta.type, 'test');
      await item.model.set('title', 'testing');
      expect(item.model.get('title')).to.eq('testing');
    }
  });
});
