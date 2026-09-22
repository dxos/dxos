//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Annotation, Collection, Database, DXN, Filter, Obj, Query, Ref, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import * as CollectionModel from './CollectionModel.ts';

describe('containing', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('returns the collection an object is filed under', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const collection = db.add(Collection.make({ name: 'People', objects: [Ref.make(person)] }));
    db.add(Collection.make({ name: 'Other', objects: [] }));
    await db.flush();

    const results = await db.query(CollectionModel.containing(person)).run();
    expect(results.map((result) => result.id)).toEqual([collection.id]);
  });

  test('returns nothing for an object outside every collection', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    db.add(Collection.make({ name: 'People', objects: [] }));
    await db.flush();

    const results = await db.query(CollectionModel.containing(person)).run();
    expect(results).toEqual([]);
  });
});

describe('add', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  /** A hidden type stands in for implementation-detail objects (a sketch's canvas, a game's state). */
  class HiddenState extends Type.makeObject<HiddenState>(DXN.make('org.dxos.test.hiddenState', '0.1.0'))(
    Schema.Struct({ value: Schema.String }).pipe(Annotation.HiddenAnnotation.set(true)),
  ) {}

  const add = (db: EchoDatabase, props: { object: Obj.Unknown; target?: Collection.Collection }) =>
    CollectionModel.add(props).pipe(Effect.provide(Database.layer(db)), Effect.runPromise);

  test('files a visible object into the target collection', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });
    const collection = db.add(Collection.make({ name: 'People', objects: [] }));
    await add(db, { object: Obj.make(TestSchema.Person, { name: 'alice' }), target: collection });
    await db.flush();

    expect(collection.objects).toHaveLength(1);
  });

  test('keeps a hidden object out of the target collection but still persists it', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, HiddenState] });
    const collection = db.add(Collection.make({ name: 'People', objects: [] }));
    const hidden = Obj.make(HiddenState, { value: 'canvas' });
    await add(db, { object: hidden, target: collection });
    await db.flush();

    // Collection membership drives the navtree; a hidden object filed there would show up as a
    // sibling of the object that owns it (see plugin-illustrator's Sketch/canvas pair).
    expect(collection.objects).toHaveLength(0);
    expect(Obj.getDatabase(hidden)).toBeDefined();
  });
});

describe('ownership', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const createDatabase = () => builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });

  test('the first collection to hold an object becomes its parent', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const first = db.add(Collection.make({ name: 'First', objects: [Ref.make(person)] }));
    const second = db.add(Collection.make({ name: 'Second', objects: [] }));
    Obj.update(second, (second) => {
      second.objects.push(Ref.make(person));
    });
    await db.flush();

    expect(Obj.getParent(person)?.id).toBe(first.id);
    expect(CollectionModel.isCanonicalHolder(person, first)).toBe(true);
    expect(CollectionModel.isCanonicalHolder(person, second)).toBe(false);
  });

  test('an object nothing has claimed reads as canonical anywhere', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const collection = db.add(Collection.make({ name: 'People', objects: [] }));
    await db.flush();

    expect(Obj.getParent(person)).toBeUndefined();
    expect(CollectionModel.isCanonicalHolder(person, collection)).toBe(true);
  });

  test('moving from the owning collection hands ownership to the destination', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const from = db.add(Collection.make({ name: 'From', objects: [Ref.make(person)] }));
    const to = db.add(Collection.make({ name: 'To', objects: [] }));
    CollectionModel.move({ object: person, from, to });
    await db.flush();

    expect(from.objects).toHaveLength(0);
    expect(to.objects).toHaveLength(1);
    expect(Obj.getParent(person)?.id).toBe(to.id);
  });

  test('moving a linked object moves the link and leaves ownership alone', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    // `owner` holds the object; `linked` gets a second reference to it, which claims nothing.
    const owner = db.add(Collection.make({ name: 'Owner', objects: [Ref.make(person)] }));
    const linked = db.add(Collection.make({ name: 'Linked', objects: [] }));
    Obj.update(linked, (linked) => {
      linked.objects.push(Ref.make(person));
    });
    const elsewhere = db.add(Collection.make({ name: 'Elsewhere', objects: [] }));
    CollectionModel.move({ object: person, from: linked, to: elsewhere });
    await db.flush();

    expect(Obj.getParent(person)?.id).toBe(owner.id);
    expect(linked.objects).toHaveLength(0);
    expect(elsewhere.objects).toHaveLength(1);
    expect(owner.objects).toHaveLength(1);
  });

  test('unlinking drops the reference and leaves the object and its parent', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const owner = db.add(Collection.make({ name: 'Owner', objects: [Ref.make(person)] }));
    const linked = db.add(Collection.make({ name: 'Linked', objects: [] }));
    Obj.update(linked, (linked) => {
      linked.objects.push(Ref.make(person));
    });
    CollectionModel.unlink({ object: person, from: linked });
    await db.flush();

    expect(linked.objects).toHaveLength(0);
    expect(owner.objects).toHaveLength(1);
    expect(Obj.getParent(person)?.id).toBe(owner.id);
    expect(Obj.getDatabase(person)).toBeDefined();
  });

  test('filing unfiled persists the object without joining a collection', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = Obj.make(TestSchema.Person, { name: 'alice' });
    await CollectionModel.add({ object: person, target: CollectionModel.Unfiled }).pipe(
      Effect.provide(Database.layer(db)),
      Effect.runPromise,
    );
    await db.flush();

    expect(Obj.getDatabase(person)).toBeDefined();
    const results = await db.query(CollectionModel.containing(person)).run();
    expect(results).toEqual([]);
  });
});

describe('orderByRefs', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const createDatabase = () => builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });

  test('restores the array order a query does not preserve', async ({ expect }) => {
    const { db } = await createDatabase();
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const bob = db.add(Obj.make(TestSchema.Person, { name: 'bob' }));
    const carol = db.add(Obj.make(TestSchema.Person, { name: 'carol' }));
    const collection = db.add(Collection.make({ objects: [Ref.make(carol), Ref.make(alice), Ref.make(bob)] }));
    await db.flush();

    // Query results arrive in whatever order the engine produced them.
    const ordered = CollectionModel.orderByRefs([alice, bob, carol], collection.objects);
    expect(ordered.map((object) => object.name)).toEqual(['carol', 'alice', 'bob']);
  });

  test('a dangling entry simply has no result and does not shift the rest', async ({ expect }) => {
    const { db } = await createDatabase();
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const gone = db.add(Obj.make(TestSchema.Person, { name: 'gone' }));
    const bob = db.add(Obj.make(TestSchema.Person, { name: 'bob' }));
    const collection = db.add(Collection.make({ objects: [Ref.make(alice), Ref.make(gone), Ref.make(bob)] }));
    await db.flush();

    // The query omits the deleted target; its ref stays in the array as a dangling entry.
    const ordered = CollectionModel.orderByRefs([bob, alice], collection.objects);
    expect(ordered.map((object) => object.name)).toEqual(['alice', 'bob']);
  });

  test('an object the array does not name sorts last rather than being dropped', async ({ expect }) => {
    const { db } = await createDatabase();
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const stranger = db.add(Obj.make(TestSchema.Person, { name: 'stranger' }));
    const collection = db.add(Collection.make({ objects: [Ref.make(alice)] }));
    await db.flush();

    const ordered = CollectionModel.orderByRefs([stranger, alice], collection.objects);
    expect(ordered.map((object) => object.name)).toEqual(['alice', 'stranger']);
  });
});

describe('reference traversal', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // The query the graph builders run in place of dereferencing `Collection.objects`.
  const members = (db: EchoDatabase, collection: Collection.Collection) =>
    db.query(Query.select(Filter.entity(collection)).reference('objects')).run();

  test('returns the collection members', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const bob = db.add(Obj.make(TestSchema.Person, { name: 'bob' }));
    const collection = db.add(Collection.make({ objects: [Ref.make(alice), Ref.make(bob)] }));
    await db.flush();

    const results = await members(db, collection);
    expect(results.map((object) => object.id).sort()).toEqual([alice.id, bob.id].sort());
  });

  test('omits a deleted member while its ref stays in the array', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });
    const alice = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    const bob = db.add(Obj.make(TestSchema.Person, { name: 'bob' }));
    const collection = db.add(Collection.make({ objects: [Ref.make(alice), Ref.make(bob)] }));
    await db.flush();

    db.remove(bob);
    await db.flush();

    const results = await members(db, collection);
    expect(results.map((object) => object.id)).toEqual([alice.id]);
    // Nobody sweeps holders on deletion, so the count must come from the query, not the array.
    expect(collection.objects).toHaveLength(2);
  });
});
