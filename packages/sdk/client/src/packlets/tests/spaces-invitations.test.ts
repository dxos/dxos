//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
import { TestBuilder, testSpace } from '../testing';

describe('Spaces/invitations', () => {
  test('creates a space and invites a peer', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createClientServicesHost() });
    afterTest(() => client.destroy());
    await client.initialize();
    await client.halo.createProfile({ displayName: 'test-user' });

    {
      const space = await client.echo.createSpace();
      await testSpace(space.internal.db);
    }
  });
});
