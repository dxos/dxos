//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { Filter, type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Expando, create } from '@dxos/echo-schema';
import { describe, test, beforeEach, beforeAll, afterAll } from '@dxos/test';

import { Migrations } from './migrations';

Migrations.define('test', [
  {
    version: '1970-01-01',
    next: async ({ builder }) => {
      builder.addObject(Expando, { namespace: 'test', count: 1 });
    },
  },
  {
    version: '1970-01-02',
    next: async ({ space, builder }) => {
      const { objects } = await space.db.query({ namespace: 'test' }).run();
      for (const object of objects) {
        await builder.migrateObject(object.id, ({ data }) => ({
          schema: Expando,
          props: { namespace: data.namespace, count: 2 },
        }));
      }
    },
  },
  {
    version: '1970-01-03',
    next: async ({ space, builder }) => {
      const { objects } = await space.db.query({ namespace: 'test' }).run();
      for (const object of objects) {
        await builder.migrateObject(object.id, ({ data }) => ({
          schema: Expando,
          props: { namespace: data.namespace, count: data.count * 3 },
        }));
      }
    },
  },
]);

describe('Migrations', () => {
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

  test('if no migrations have been run before, runs all migrations', async () => {
    await Migrations.migrate(space);
    const { objects } = await space.db.query(Filter.schema(Expando, { namespace: 'test' })).run();
    expect(objects).to.have.length(1);
    expect(objects[0].count).to.equal(6);
    expect(space.properties['test.version']).to.equal('1970-01-03');
  });

  test('if some migrations have been run before, runs only the remaining migrations', async () => {
    space.properties['test.version'] = '1970-01-02';
    space.db.add(create(Expando, { namespace: 'test', count: 5 }));
    await Migrations.migrate(space);
    const { objects } = await space.db.query(Filter.schema(Expando, { namespace: 'test' })).run();
    expect(objects).to.have.length(1);
    expect(objects[0].count).to.equal(15);
    expect(space.properties['test.version']).to.equal('1970-01-03');
  });

  test('if all migrations have been run before, does nothing', async () => {
    space.properties['test.version'] = '1970-01-03';
    await Migrations.migrate(space);
    const { objects } = await space.db.query(Filter.schema(Expando, { namespace: 'test' })).run();
    expect(objects).to.have.length(0);
  });

  test('if target version is specified, runs only the migrations up to that version', async () => {
    await Migrations.migrate(space, '1970-01-02');
    const { objects } = await space.db.query(Filter.schema(Expando, { namespace: 'test' })).run();
    expect(objects).to.have.length(1);
    expect(objects[0].count).to.equal(2);
    expect(space.properties['test.version']).to.equal('1970-01-02');
  });
});
