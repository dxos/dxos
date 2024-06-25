//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { Filter, type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Expando, create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { describe, test, beforeEach, beforeAll, afterAll } from '@dxos/test';

import { Migrations } from './migrations';

describe.only('Verification', () => {
  let client: Client;
  let space: Space;

  beforeAll(async () => {
    const testBuilder = new TestBuilder();
    client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    await client.halo.createIdentity();
  });

  afterAll(async () => {
    await client.destroy();
  });

  beforeEach(async () => {
    space = await client.spaces.create();
  });

  test('migration verification succeeds', async () => {
    let verified = false;
    Migrations.define('test', [
      {
        version: '1970-01-01',
        next: async ({ builder }) => {
          await builder.addObject(Expando, { namespace: 'test', count: 1 });
        },
        verify: async ({ space }) => {
          // TODO(wittjosiah): Expando filter fails.
          // const { objects } = await space.db.query(Filter.schema(Expando, { namespace: 'test' })).run();
          const { objects } = await space.db.query({ namespace: 'test' }).run();
          invariant(objects.length === 1, 'Expected one object');
          invariant(objects[0].count === 1, 'Expected count to be 1');
          verified = true;
        },
      },
    ]);

    await Migrations.migrate(space);
    expect(verified).to.equal(true);
  });

  test('migration rolls back if verification fails', async () => {
    space.db.add(create(Expando, { namespace: 'test', count: 1 }));
    Migrations.define('test', [
      {
        version: '1970-01-01',
        next: async ({ builder }) => {
          const { objects } = await space.db.query(Filter.schema(Expando, { namespace: 'test' })).run();
          for (const object of objects) {
            await builder.migrateObject(object.id, ({ data }) => ({
              schema: Expando,
              props: { namespace: data.namespace, count: 2 },
            }));
          }
        },
        verify: async () => {
          invariant(false, 'Verification failed');
        },
      },
    ]);

    await Migrations.migrate(space);

    const { objects } = await space.db.query(Filter.schema(Expando, { namespace: 'test' })).run();
    // TODO(wittjosiah): Rollback does not work.
    expect(objects[0].count).to.equal(1);
  });
});
