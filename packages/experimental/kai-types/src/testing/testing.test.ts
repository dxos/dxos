//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { fromHost } from '@dxos/client/services';
import { afterTest, test } from '@dxos/test';

import { Generator } from './testing';

test('generate test data', async () => {
  const client = new Client({ services: fromHost() });
  afterTest(() => client.destroy());

  await client.initialize();
  await client.halo.createIdentity();
  const space = await client.spaces.create();

  const generator = new Generator(space.db, {
    organizations: { min: 1, max: 1 },
    projects: { min: 1, max: 1 },
    tasks: { min: 1, max: 1 },
    contacts: { min: 1, max: 1 },
    events: { min: 1, max: 1 },
    documents: { min: 1, max: 1 },
    messages: { min: 1, max: 1 },
  });

  await generator.generate();
});
