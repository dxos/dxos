//
// Copyright 2022 DXOS.org
//

import { faker } from '@faker-js/faker';
import { expect } from 'chai';

import { Client } from '@dxos/client';
import { Expando } from '@dxos/client/echo';
import { describe, test } from '@dxos/test';

import { filterObjects } from './search';

faker.seed(1);

// TODO(burdon): Reconcile with agent/minisearch.

describe('Search', () => {
  test('Prefix text search', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();

    const space = await client.spaces.create();

    Array.from({ length: 20 }).forEach(() =>
      space.db.add(new Expando({ title: faker.lorem.sentence(), content: faker.lorem.sentences() })),
    );

    const { objects } = space.db.query();
    const results = filterObjects(objects, /quo/i);
    expect(results).to.have.length(8);
  });
});
