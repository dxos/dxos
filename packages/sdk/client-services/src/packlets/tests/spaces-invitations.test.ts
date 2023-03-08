//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';
import { describe, test, afterTest } from '@dxos/test';

import { TestBuilder, testSpace } from '../testing';

describe('Spaces/invitations', () => {
  test('creates a space and invites a peer', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client.destroy());
    await client.initialize();
    await client.halo.createIdentity({ displayName: 'test-user' });

    {
      const space = await client.echo.createSpace();
      await testSpace(space.internal.db);
    }
  });
});
