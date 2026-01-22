//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Client } from '@dxos/client';
import { Filter, Obj, Type } from '@dxos/echo';
import { faker } from '@dxos/random';

import { filterObjectsSync } from './sync';

faker.seed(1);

// TODO(burdon): Reconcile with agent/minisearch.

describe('Search', () => {
  // TODO(mykola): Fix FTS index to filter by fields.
  test.skip('Prefix text search', async () => {
    const client = new Client();
    await client.initialize();
    await client.halo.createIdentity();

    const match = 'xxx';
    const space = await client.spaces.create();
    Array.from({ length: 20 }).map((_, i) => {
      const content =
        i === 10 ? faker.lorem.sentence() + ` ${match}}. ` + faker.lorem.sentence() : faker.lorem.sentences();
      return space.db.add(Obj.make(Type.Expando, { title: faker.lorem.sentence(), content }));
    });

    const objects = await space.db.query(Filter.everything()).run();
    const results = filterObjectsSync(objects, new RegExp(match, 'i'));
    expect(results).to.have.length(1);
  });
});
