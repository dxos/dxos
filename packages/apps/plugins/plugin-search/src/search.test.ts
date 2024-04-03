//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import * as E from '@dxos/echo-schema';
import { faker } from '@dxos/random';
import { describe, test } from '@dxos/test';

import { filterObjects } from './search';

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
      return space.db.add(E.object(E.ExpandoType, { title: faker.lorem.sentence(), content }));
    });

    const { objects } = space.db.query();
    const results = filterObjects(objects, new RegExp(match, 'i'));
    expect(results).to.have.length(1);
  });
});
