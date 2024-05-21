//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Expando, create } from '@dxos/echo-schema';
import { describe, test, beforeEach, beforeAll, afterAll } from '@dxos/test';

import { Migrations } from './migrations';

Migrations.define('test', [
  {
    version: 1,
    up: async ({ space }) => {
      space.db.add(create(Expando, { namespace: 'test', count: 1 }));
    },
    down: async ({ space }) => {
      const { objects } = await space.db.query({ namespace: 'test' }).run();
      for (const object of objects) {
        space.db.remove(object);
      }
    },
  },
  {
    version: 2,
    up: async ({ space }) => {
      const { objects } = await space.db.query({ namespace: 'test' }).run();
      for (const object of objects) {
        object.count = 2;
      }
    },
    down: async () => {
      // No-op.
    },
  },
  {
    version: 3,
    up: async ({ space }) => {
      const { objects } = await space.db.query({ namespace: 'test' }).run();
      for (const object of objects) {
        object.count *= 3;
      }
    },
    down: async ({ space }) => {
      const { objects } = await space.db.query({ namespace: 'test' }).run();
      for (const object of objects) {
        object.count /= 3;
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
    const { objects } = await space.db.query({ namespace: 'test' }).run();
    expect(objects).to.have.length(1);
    expect(objects[0].count).to.equal(6);
    expect(space.properties['test.version']).to.equal(3);
  });

  test('if some migrations have been run before, runs only the remaining migrations', async () => {
    space.properties['test.version'] = 2;
    space.db.add(create(Expando, { namespace: 'test', count: 5 }));
    await Migrations.migrate(space);
    const { objects } = await space.db.query({ namespace: 'test' }).run();
    expect(objects).to.have.length(1);
    expect(objects[0].count).to.equal(15);
    expect(space.properties['test.version']).to.equal(3);
  });

  test('if all migrations have been run before, does nothing', async () => {
    space.properties['test.version'] = 3;
    await Migrations.migrate(space);
    const { objects } = await space.db.query({ namespace: 'test' }).run();
    expect(objects).to.have.length(0);
  });

  test('if target version is specified, runs only the migrations up to that version', async () => {
    await Migrations.migrate(space, 2);
    const { objects } = await space.db.query({ namespace: 'test' }).run();
    expect(objects).to.have.length(1);
    expect(objects[0].count).to.equal(2);
    expect(space.properties['test.version']).to.equal(2);
  });

  test('if target version is specified and is lower than current version, runs the down migrations', async () => {
    await Migrations.migrate(space);
    const beforeDowngrade = await space.db.query({ namespace: 'test' }).run();
    expect(beforeDowngrade.objects).to.have.length(1);
    expect(beforeDowngrade.objects[0].count).to.equal(6);
    expect(space.properties['test.version']).to.equal(3);
    await Migrations.migrate(space, 1);
    const afterDowngrade = await space.db.query({ namespace: 'test' }).run();
    expect(afterDowngrade.objects).to.have.length(1);
    expect(afterDowngrade.objects[0].count).to.equal(2);
    expect(space.properties['test.version']).to.equal(1);
  });
});
