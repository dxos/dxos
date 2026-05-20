//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Filter, Obj, Relation } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { runAndForwardErrors } from '@dxos/effect';

import reset from './reset';
import { SpaceOperation } from './definitions';

describe('SpaceOperation.Reset', () => {
  test('removes all user objects from the space', async ({ expect }) => {
    const space = await createSpaceWithObjects(3);

    const beforeAll = await space.db.query(Filter.everything()).run();
    const beforeUser = beforeAll.filter((object) => Obj.getTypename(object) === TestSchema.Expando.typename);
    expect(beforeUser).toHaveLength(3);

    await runAndForwardErrors(reset.handler({ space } as SpaceOperation.Reset.Input));
    await space.db.flush();

    const afterAll = await space.db.query(Filter.everything()).run();
    const afterUser = afterAll.filter((object) => Obj.getTypename(object) === TestSchema.Expando.typename);
    expect(afterUser, `expected no user objects after reset, got ${afterAll.length} total entities`).toHaveLength(0);
  });

  test('removes relations from the space', async ({ expect }) => {
    const builder = new TestBuilder();
    onTestFinished(() => builder.destroy());
    const client = new Client({ services: builder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());

    await client.halo.createIdentity({ displayName: 'tester' });
    await client.addTypes([TestSchema.Person, TestSchema.Task, TestSchema.HasManager]);
    const space = await client.spaces.create();
    await space.waitUntilReady();

    const alice = space.db.add(
      Obj.make(TestSchema.Person, { name: 'Alice', username: 'alice', email: 'a@x', tasks: [], address: { coordinates: {} } }),
    );
    const bob = space.db.add(
      Obj.make(TestSchema.Person, { name: 'Bob', username: 'bob', email: 'b@x', tasks: [], address: { coordinates: {} } }),
    );
    space.db.add(
      Relation.make(TestSchema.HasManager, {
        [Relation.Source]: alice,
        [Relation.Target]: bob,
      }),
    );
    await space.db.flush();

    const beforeEntities = await space.db.query(Filter.everything()).run();
    const beforeRelations = beforeEntities.filter(Relation.isRelation);
    expect(beforeRelations).toHaveLength(1);

    await runAndForwardErrors(reset.handler({ space } as SpaceOperation.Reset.Input));
    await space.db.flush();

    const afterEntities = await space.db.query(Filter.everything()).run();
    const afterRelations = afterEntities.filter(Relation.isRelation);
    expect(afterRelations, `expected no relations after reset, got ${afterRelations.length}`).toHaveLength(0);
    const afterPersons = afterEntities.filter((object) => Obj.getTypename(object) === TestSchema.Person.typename);
    expect(afterPersons, `expected no person objects after reset, got ${afterPersons.length}`).toHaveLength(0);
  });

  test('removes registered schemas from the space', async ({ expect }) => {
    const space = await createSpaceWithObjects(0);
    await space.db.schemaRegistry.register([TestSchema.Expando]);
    await space.db.flush();

    const beforeSchemas = space.db.schemaRegistry.query().runSync();
    expect(
      beforeSchemas.length,
      'expected the registered Expando schema to be present in the space schema registry before reset',
    ).toBeGreaterThan(0);

    await runAndForwardErrors(reset.handler({ space } as SpaceOperation.Reset.Input));
    await space.db.flush();

    const afterSchemas = space.db.schemaRegistry.query().runSync();
    expect(
      afterSchemas,
      `expected no schemas after reset, got ${afterSchemas.map((s) => s.typename).join(', ')}`,
    ).toHaveLength(0);
  });
});

const createSpaceWithObjects = async (count: number) => {
  const builder = new TestBuilder();
  onTestFinished(() => builder.destroy());
  const client = new Client({ services: builder.createLocalClientServices() });
  await client.initialize();
  onTestFinished(() => client.destroy());

  await client.halo.createIdentity({ displayName: 'tester' });
  await client.addTypes([TestSchema.Expando]);

  const space = await client.spaces.create();
  await space.waitUntilReady();
  for (let i = 0; i < count; i += 1) {
    space.db.add(Obj.make(TestSchema.Expando, { index: i }));
  }
  await space.db.flush();
  return space;
};
