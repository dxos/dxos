//
// Copyright 2026 DXOS.org
//

import { afterAll, beforeAll, describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Filter, Obj, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

describe('Migration.Transaction', () => {
  let client: Client;

  beforeAll(async () => {
    const testBuilder = new TestBuilder();
    client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    await client.halo.createIdentity();
    await client.addTypes([TestSchema.Expando, TestSchema.Organization, TestSchema.Person, TestSchema.Task]);
  });

  afterAll(async () => {
    await client.destroy();
  });

  const createSpace = async (): Promise<Space> => {
    const space = await client.spaces.create();
    await space.waitUntilReady();
    return space;
  };

  test('migrate changes the type of an object in place', async ({ expect }) => {
    const space = await createSpace();
    const task = space.db.add(Obj.make(TestSchema.Task, { title: 'Write tests' }));
    await space.db.flush();

    const migration = space.db.beginMigration();
    const found = await migration.migrate(task.id, (json) =>
      Obj.make(TestSchema.Expando, { id: json.id, label: String(json.title) }),
    );
    expect(found).toBe(true);
    expect((await migration.get(task.id))?.label).toBe('Write tests');

    // Staged changes stay out of the database until commit.
    expect(await space.db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(1);
    await migration.commit();

    await expect.poll(() => space.db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(0);
    const [migrated] = await space.db.query(Filter.type(TestSchema.Expando)).run();
    expect(migrated?.id).toBe(task.id);
    expect(migrated?.label).toBe('Write tests');
  });

  test('migrate skips objects that are not stored', async ({ expect }) => {
    const space = await createSpace();
    const migration = space.db.beginMigration();
    const found = await migration.migrate(Obj.ID.random(), () => Obj.make(TestSchema.Expando, {}));
    expect(found).toBe(false);
  });

  test('add stores the object with the objects it references', async ({ expect }) => {
    const space = await createSpace();
    const organization = Obj.make(TestSchema.Organization, { name: 'DXOS' });
    const person = Obj.make(TestSchema.Person, { name: 'Alice', employer: Ref.make(organization) });

    const migration = space.db.beginMigration();
    migration.add(person);
    expect((await migration.get(organization.id))?.name).toBe('DXOS');
    await migration.commit();

    await expect.poll(() => space.db.query(Filter.type(TestSchema.Person)).run()).toHaveLength(1);
    const [stored] = await space.db.query(Filter.type(TestSchema.Person)).run();
    const employer = await stored?.employer?.load();
    expect(employer?.name).toBe('DXOS');
  });

  test('delete removes the object', async ({ expect }) => {
    const space = await createSpace();
    const kept = space.db.add(Obj.make(TestSchema.Expando, { name: 'kept' }));
    const removed = space.db.add(Obj.make(TestSchema.Expando, { name: 'removed' }));
    await space.db.flush();

    const migration = space.db.beginMigration();
    migration.delete(removed.id);
    expect(await migration.get(removed.id)).toBeUndefined();
    await migration.commit();

    await expect
      .poll(async () => (await space.db.query(Filter.type(TestSchema.Expando)).run()).map(({ id }) => id))
      .toEqual([kept.id]);
  });

  test('a committed transaction cannot be reused', async ({ expect }) => {
    const space = await createSpace();
    const migration = space.db.beginMigration();
    await migration.commit();
    expect(() => migration.delete(Obj.ID.random())).toThrow();
  });
});
