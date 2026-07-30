//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection, Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';

import { walkCollectionChainToRoot } from './collection-path';

describe('walkCollectionChainToRoot', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection] });
    const walk = (objectId: string, rootId: string) =>
      EffectEx.runPromise(walkCollectionChainToRoot({ objectId, rootId }).pipe(Effect.provide(Database.layer(db))));
    return { db, walk };
  };

  /** A collection holding the given objects, added to the database. */
  const addCollection = (db: Database.Database, objects: Obj.Unknown[]) =>
    db.add(Collection.make({ objects: objects.map((object) => Ref.make(object)) }));

  test('an object directly in the root collection has an empty chain', async ({ expect }) => {
    const { db, walk } = await setup();
    const leaf = db.add(Collection.make());
    const root = addCollection(db, [leaf]);
    await db.flush({ indexes: true });

    // Empty rather than null: the object sits directly under `content/collections`, no intermediate ids.
    expect(await walk(leaf.id, root.id)).toEqual([]);
  });

  test('a nested object yields its ancestors root-to-leaf', async ({ expect }) => {
    const { db, walk } = await setup();
    const leaf = db.add(Collection.make());
    const inner = addCollection(db, [leaf]);
    const outer = addCollection(db, [inner]);
    const root = addCollection(db, [outer]);
    await db.flush({ indexes: true });

    expect(await walk(leaf.id, root.id)).toEqual([outer.id, inner.id]);
  });

  test('an object outside the root collection tree has no chain', async ({ expect }) => {
    const { db, walk } = await setup();
    const orphan = db.add(Collection.make());
    const root = addCollection(db, []);
    await db.flush({ indexes: true });

    expect(await walk(orphan.id, root.id)).toBeNull();
  });

  test('an object in a collection detached from the root has no chain', async ({ expect }) => {
    const { db, walk } = await setup();
    const leaf = db.add(Collection.make());
    addCollection(db, [leaf]);
    const root = addCollection(db, []);
    await db.flush({ indexes: true });

    // The leaf has a parent, but walking up never reaches the root collection.
    expect(await walk(leaf.id, root.id)).toBeNull();
  });

  test('a cycle terminates instead of looping', async ({ expect }) => {
    const { db, walk } = await setup();
    const first = db.add(Collection.make());
    const second = addCollection(db, [first]);
    Obj.update(first, (first) => {
      first.objects = [Ref.make(second)];
    });
    const root = addCollection(db, []);
    await db.flush({ indexes: true });

    expect(await walk(first.id, root.id)).toBeNull();
  });
});
