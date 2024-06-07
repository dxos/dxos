//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { create, Expando } from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { describe, test } from '@dxos/test';

import { filterObjectsSync } from './search';

faker.seed(1);

// TODO(burdon): Reconcile with agent/minisearch.

describe('Search', () => {
  test('Prefix text search', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();

    const match = 'xxx';
    const space = await client.spaces.create();
    Array.from({ length: 20 }).map((_, i) => {
      const content =
        i === 10 ? faker.lorem.sentence() + ` ${match}}. ` + faker.lorem.sentence() : faker.lorem.sentences();
      return space.db.add(create(Expando, { title: faker.lorem.sentence(), content }));
    });

    const { objects } = await space.db.query().run();
    const results = filterObjectsSync(objects, new RegExp(match, 'i'));
    expect(results).to.have.length(1);
  });
});
