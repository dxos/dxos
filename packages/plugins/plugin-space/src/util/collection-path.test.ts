//
// Copyright 2026 DXOS.org
//

import type * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import { SpaceProperties } from '@dxos/client/echo';
import { Annotation, Collection, Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EntityId } from '@dxos/keys';

import { resolveCollectionObjectPath, resolveObjectPath, walkCollectionChainToRoot } from './collection-path.ts';

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

  test('an object listed in two collections walks through its parent', async ({ expect }) => {
    const { db, walk } = await setup();
    const leaf = db.add(Collection.make());
    const other = addCollection(db, [leaf]);
    const parent = addCollection(db, [leaf]);
    Obj.setParent(leaf, parent);
    const root = addCollection(db, [other, parent]);
    await db.flush({ indexes: true });

    expect(await walk(leaf.id, root.id)).toEqual([parent.id]);
  });

  test('an object owned by another object walks through its owner', async ({ expect }) => {
    const { db, walk } = await setup();
    // A presenter slide is listed in no collection: it hangs off its presentation, which is the thing
    // the collection holds. Without this step the slide has no path and its plank never resolves.
    const owned = db.add(Collection.make());
    const owner = db.add(Collection.make());
    Obj.setParent(owned, owner);
    const root = addCollection(db, [owner]);
    await db.flush({ indexes: true });

    expect(await walk(owned.id, root.id)).toEqual([owner.id]);
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

describe('resolveCollectionObjectPath', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, SpaceProperties] });
    const resolve = (objectId: string) =>
      EffectEx.runPromise(resolveCollectionObjectPath({ objectId }).pipe(Effect.provide(Database.layer(db))));
    return { db, resolve };
  };

  /** A collection holding the given objects, added to the database. */
  const addCollection = (db: Database.Database, objects: Obj.Unknown[]) =>
    db.add(Collection.make({ objects: objects.map((object) => Ref.make(object)) }));

  /** Declare `root` the space's root collection, the way space provisioning does. */
  const setRootCollection = (db: Database.Database, root: Collection.Collection) => {
    const properties = db.add(Obj.make(SpaceProperties, {}));
    Obj.update(properties, (properties) => {
      Annotation.set(properties, AppAnnotation.RootCollectionAnnotation, Ref.make(root));
    });
  };

  test('assembles the nested chain into a collections path, root to leaf', async ({ expect }) => {
    const { db, resolve } = await setup();
    const leaf = db.add(Collection.make());
    const inner = addCollection(db, [leaf]);
    const outer = addCollection(db, [inner]);
    setRootCollection(db, addCollection(db, [outer]));
    await db.flush({ indexes: true });

    expect(await resolve(leaf.id)).toBe(`root/${db.spaceId}/content/collections/${outer.id}/${inner.id}/${leaf.id}`);
  });

  test('an object directly in the root collection sits directly under the section', async ({ expect }) => {
    const { db, resolve } = await setup();
    const leaf = db.add(Collection.make());
    setRootCollection(db, addCollection(db, [leaf]));
    await db.flush({ indexes: true });

    expect(await resolve(leaf.id)).toBe(`root/${db.spaceId}/content/collections/${leaf.id}`);
  });

  test('resolves nothing without a root-collection annotation', async ({ expect }) => {
    const { db, resolve } = await setup();
    const leaf = db.add(Collection.make());
    // Space properties exist but declare no root collection — a space before provisioning.
    db.add(Obj.make(SpaceProperties, {}));
    await db.flush({ indexes: true });

    expect(await resolve(leaf.id)).toBeUndefined();
  });

  test('resolves nothing for an object outside the collection tree', async ({ expect }) => {
    const { db, resolve } = await setup();
    const orphan = db.add(Collection.make());
    setRootCollection(db, addCollection(db, []));
    await db.flush({ indexes: true });

    expect(await resolve(orphan.id)).toBeUndefined();
  });
});

describe('resolveObjectPath', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, SpaceProperties] });
    const resolve = (objectId: string, timeout?: Duration.Input) =>
      EffectEx.runPromise(resolveObjectPath({ objectId, timeout }).pipe(Effect.provide(Database.layer(db))));
    return { db, resolve };
  };

  test('an object no collection lists yet opens under its database path', async ({ expect }) => {
    const { db, resolve } = await setup();
    const orphan = db.add(Collection.make());
    await db.flush({ indexes: true });

    expect(await resolve(orphan.id)).toBe(GraphPath.getObjectPathFromObject(orphan));
  });

  test('an object that arrives after the link opens is awaited', async ({ expect }) => {
    const { db, resolve } = await setup();
    const arriving = Collection.make();
    const resolved = resolve(arriving.id);
    db.add(arriving);

    expect(await resolved).toBe(GraphPath.getObjectPathFromObject(arriving));
  });

  test('an object that never arrives resolves to nothing once the wait ends', async ({ expect }) => {
    const { resolve } = await setup();

    expect(await resolve(EntityId.random(), '10 millis')).toBeUndefined();
  });
});
