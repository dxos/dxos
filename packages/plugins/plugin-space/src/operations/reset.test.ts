//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, onTestFinished, test } from 'vitest';

import { Capability } from '@dxos/app-framework';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Filter, Obj, Relation, Type } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';

import reset from './reset';

// The handler is wired against `Capability.Service` because the operation definition declares it,
// but `reset.ts` does not consume the service. A stub keeps the effect's requirement satisfied for
// direct invocation outside the framework runtime.
const invokeReset = (space: Space) =>
  runAndForwardErrors(reset.handler({ space }).pipe(Effect.provideService(Capability.Service, {} as any)));

describe('SpaceOperation.Reset', () => {
  test('removes all user objects from the space', async ({ expect }) => {
    const space = await createSpaceWithObjects(3);

    const beforeAll = await space.db.query(Filter.everything()).run();
    const beforeUser = beforeAll.filter((object) => Obj.getTypename(object) === Type.getTypename(TestSchema.Expando));
    expect(beforeUser).toHaveLength(3);

    await invokeReset(space);
    await space.db.flush();

    const afterAll = await space.db.query(Filter.everything()).run();
    const afterUser = afterAll.filter((object) => Obj.getTypename(object) === Type.getTypename(TestSchema.Expando));
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
      Obj.make(TestSchema.Person, {
        name: 'Alice',
        username: 'alice',
        email: 'a@x',
        tasks: [],
        address: { coordinates: {} },
      }),
    );
    const bob = space.db.add(
      Obj.make(TestSchema.Person, {
        name: 'Bob',
        username: 'bob',
        email: 'b@x',
        tasks: [],
        address: { coordinates: {} },
      }),
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

    await invokeReset(space);
    await space.db.flush();

    const afterEntities = await space.db.query(Filter.everything()).run();
    const afterRelations = afterEntities.filter(Relation.isRelation);
    expect(afterRelations, `expected no relations after reset, got ${afterRelations.length}`).toHaveLength(0);
    const afterPersons = afterEntities.filter(
      (object) => Obj.getTypename(object) === Type.getTypename(TestSchema.Person),
    );
    expect(afterPersons, `expected no person objects after reset, got ${afterPersons.length}`).toHaveLength(0);
  });

  test('removes registered schemas from the space', async ({ expect }) => {
    const space = await createSpaceWithObjects(0);
    space.db.add(TestSchema.Expando);
    await space.db.flush();

    const beforeSchemas = await space.db.query(Filter.type(Type.Type)).run();
    expect(
      beforeSchemas.length,
      'expected the registered Expando schema to be present in the space schema registry before reset',
    ).toBeGreaterThan(0);

    await invokeReset(space);
    await space.db.flush();

    const afterSchemas = await space.db.query(Filter.type(Type.Type)).run();
    expect(
      afterSchemas,
      `expected no schemas after reset, got ${afterSchemas.map((s) => Type.getTypename(s)).join(', ')}`,
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
