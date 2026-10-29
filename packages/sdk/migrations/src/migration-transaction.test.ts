//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder } from '@dxos/client/testing';
import { Filter, Migration, Obj, Ref } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

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

    const migration = await space.db.beginMigration();
    const found = await EffectEx.runPromise(
      migration.migrate(task.id, (json) => Obj.make(TestSchema.Expando, { id: json.id, label: String(json.title) })),
    );
    expect(found).toBe(true);
    expect(Option.getOrUndefined(await EffectEx.runPromise(migration.get(task.id)))?.label).toBe('Write tests');

    // Staged changes stay out of the database until commit.
    expect(await space.db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(1);
    await EffectEx.runPromise(migration.commit());

    await expect.poll(() => space.db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(0);
    const [migrated] = await space.db.query(Filter.type(TestSchema.Expando)).run();
    expect(migrated?.id).toBe(task.id);
    expect(migrated?.label).toBe('Write tests');
  });

  test('migrate skips objects that are not stored', async ({ expect }) => {
    const space = await createSpace();
    const migration = await space.db.beginMigration();
    const found = await EffectEx.runPromise(migration.migrate(Obj.ID.random(), () => Obj.make(TestSchema.Expando, {})));
    expect(found).toBe(false);
  });

  test('add stores the object with the objects it references', async ({ expect }) => {
    const space = await createSpace();
    const organization = Obj.make(TestSchema.Organization, { name: 'DXOS' });
    const person = Obj.make(TestSchema.Person, { name: 'Alice', employer: Ref.make(organization) });

    const migration = await space.db.beginMigration();
    migration.add(person);
    expect(Option.getOrUndefined(await EffectEx.runPromise(migration.get(organization.id)))?.name).toBe('DXOS');
    await EffectEx.runPromise(migration.commit());

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

    const migration = await space.db.beginMigration();
    migration.delete(removed.id);
    expect(Option.isNone(await EffectEx.runPromise(migration.get(removed.id)))).toBe(true);
    await EffectEx.runPromise(migration.commit());

    await expect
      .poll(async () => (await space.db.query(Filter.type(TestSchema.Expando)).run()).map(({ id }) => id))
      .toEqual([kept.id]);
  });

  test('root update writes links into the current root without a new epoch', async ({ expect }) => {
    const space = await createSpace();
    const task = space.db.add(Obj.make(TestSchema.Task, { title: 'Write tests' }));
    const removed = space.db.add(Obj.make(TestSchema.Expando, { name: 'removed' }));
    await space.db.flush();
    const epochsBefore = await space.internal.getEpochs();

    const migration = await space.db.beginMigration({ root: 'update' });
    await EffectEx.runPromise(
      migration.migrate(task.id, (json) => Obj.make(TestSchema.Expando, { id: json.id, label: String(json.title) })),
    );
    migration.delete(removed.id);
    migration.add(Obj.make(TestSchema.Expando, { name: 'added' }));
    await EffectEx.runPromise(migration.commit());

    await expect
      .poll(async () =>
        (await space.db.query(Filter.type(TestSchema.Expando)).run()).map(({ label, name }) => label ?? name).sort(),
      )
      .toEqual(['Write tests', 'added']);
    expect(await space.db.query(Filter.type(TestSchema.Task)).run()).toHaveLength(0);
    expect(await space.internal.getEpochs()).toHaveLength(epochsBefore.length);
  });

  test('runMigrations commits a transaction migration', async ({ expect }) => {
    const space = await createSpace();
    const removed = space.db.add(Obj.make(TestSchema.Expando, { name: 'removed' }));
    await space.db.flush();

    await space.db.runMigrations([
      Migration.defineTransaction((transaction) => Effect.sync(() => transaction.delete(removed.id))),
    ]);

    await expect.poll(() => space.db.query(Filter.type(TestSchema.Expando)).run()).toHaveLength(0);
  });

  test('a committed transaction cannot be reused', async ({ expect }) => {
    const space = await createSpace();
    const migration = await space.db.beginMigration();
    await EffectEx.runPromise(migration.commit());
    expect(() => migration.delete(Obj.ID.random())).toThrow();
  });
});
