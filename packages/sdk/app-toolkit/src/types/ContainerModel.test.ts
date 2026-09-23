//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Annotation, Collection, Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import { CollectionItemAnnotation } from '@dxos/schema';

import * as ContainerModel from './ContainerModel.ts';

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

    const results = await db.query(ContainerModel.containing(person)).run();
    expect(results.map((result) => result.id)).toEqual([collection.id]);
  });

  test('returns nothing for an object outside every collection', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, TestSchema.Person] });
    const person = db.add(Obj.make(TestSchema.Person, { name: 'alice' }));
    db.add(Collection.make({ name: 'People', objects: [] }));
    await db.flush();

    const results = await db.query(ContainerModel.containing(person)).run();
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
    ContainerModel.add(props).pipe(Effect.provide(Database.layer(db)), Effect.runPromise);

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

const Item = Type.makeObject(DXN.make('org.dxos.test.item', '0.1.0'))(
  Schema.Struct({ name: Schema.String }).pipe(CollectionItemAnnotation.set(true)),
);

describe('ownership', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const createDatabase = () => builder.createDatabase({ types: [Collection.Collection, Item] });

  test('the first collection to reference an object becomes its parent', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(Item, { name: 'alice' }));
    const first = db.add(Collection.make({ objects: [Ref.make(person)] }));
    const second = db.add(Collection.make({ objects: [] }));
    Obj.update(second, (second) => {
      second.objects.push(Ref.make(person));
    });
    await db.flush();

    expect(Obj.getParent(person)?.id).toBe(first.id);
  });

  const move = (object: Obj.Unknown, from: Collection.Collection, to: Collection.Collection) => {
    const source = ContainerModel.collection(from);
    const destination = ContainerModel.collection(to);
    ContainerModel.release({ container: source, object, to: destination });
    ContainerModel.link({ container: destination, object });
  };

  test('moving from the owning collection hands ownership to the destination', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(Item, { name: 'alice' }));
    const from = db.add(Collection.make({ objects: [Ref.make(person)] }));
    const to = db.add(Collection.make({ objects: [] }));
    move(person, from, to);
    await db.flush();

    expect(from.objects).toHaveLength(0);
    expect(to.objects).toHaveLength(1);
    expect(Obj.getParent(person)?.id).toBe(to.id);
  });

  test('moving into a collection that already lists the object hands it ownership', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(Item, { name: 'alice' }));
    const from = db.add(Collection.make({ objects: [Ref.make(person)] }));
    const to = db.add(Collection.make({ objects: [] }));
    Obj.update(to, (to) => {
      to.objects.push(Ref.make(person));
    });
    move(person, from, to);
    await db.flush();

    expect(to.objects).toHaveLength(1);
    expect(Obj.getParent(person)?.id).toBe(to.id);
  });

  test('moving a linked object moves the link and leaves ownership alone', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(Item, { name: 'alice' }));
    const owner = db.add(Collection.make({ objects: [Ref.make(person)] }));
    const linked = db.add(Collection.make({ objects: [] }));
    Obj.update(linked, (linked) => {
      linked.objects.push(Ref.make(person));
    });
    const elsewhere = db.add(Collection.make({ objects: [] }));
    move(person, linked, elsewhere);
    await db.flush();

    expect(Obj.getParent(person)?.id).toBe(owner.id);
    expect(linked.objects).toHaveLength(0);
    expect(elsewhere.objects).toHaveLength(1);
  });

  test('an object would be linked only where something else owns it', async ({ expect }) => {
    const { db } = await createDatabase();
    const owned = db.add(Obj.make(Item, { name: 'owned' }));
    const loose = db.add(Obj.make(Item, { name: 'loose' }));
    const owner = db.add(Collection.make({ objects: [Ref.make(owned)] }));
    const other = ContainerModel.collection(db.add(Collection.make({ objects: [] })));
    await db.flush();

    expect(ContainerModel.wouldLink({ container: other, object: owned })).toBe(true);
    expect(ContainerModel.wouldLink({ container: other, object: owned, from: ContainerModel.collection(owner) })).toBe(
      false,
    );
    expect(ContainerModel.wouldLink({ container: other, object: loose })).toBe(false);
  });

  test('reordering leaves entries it was not given in place', async ({ expect }) => {
    const { db } = await createDatabase();
    const [a, hidden, b, c] = ['a', 'hidden', 'b', 'c'].map((name) => db.add(Obj.make(Item, { name })));
    const collection = db.add(Collection.make({ objects: [a, hidden, b, c].map((item) => Ref.make(item)) }));
    ContainerModel.reorder({ container: ContainerModel.collection(collection), objects: [c, a, b] });
    await db.flush();

    expect(collection.objects.map((ref) => ref.peek()?.id)).toEqual([c.id, hidden.id, a.id, b.id]);
  });

  test('reordering ignores objects the list no longer holds', async ({ expect }) => {
    const { db } = await createDatabase();
    const [a, removed, c] = ['a', 'removed', 'c'].map((name) => db.add(Obj.make(Item, { name })));
    const collection = db.add(Collection.make({ objects: [a, c].map((item) => Ref.make(item)) }));
    ContainerModel.reorder({ container: ContainerModel.collection(collection), objects: [removed, c, a] });
    await db.flush();

    expect(collection.objects.map((ref) => ref.peek()?.id)).toEqual([c.id, a.id]);
  });

  test('linking lists the object once and leaves its parent', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(Item, { name: 'alice' }));
    const owner = db.add(Collection.make({ objects: [Ref.make(person)] }));
    const linked = db.add(Collection.make({ objects: [] }));
    ContainerModel.link({ container: ContainerModel.collection(linked), object: person });
    ContainerModel.link({ container: ContainerModel.collection(linked), object: person });
    await db.flush();

    expect(linked.objects).toHaveLength(1);
    expect(Obj.getParent(person)?.id).toBe(owner.id);
  });

  test('unlinking drops the reference and leaves the object and its parent', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = db.add(Obj.make(Item, { name: 'alice' }));
    const owner = db.add(Collection.make({ objects: [Ref.make(person)] }));
    const linked = db.add(Collection.make({ objects: [] }));
    Obj.update(linked, (linked) => {
      linked.objects.push(Ref.make(person));
    });
    ContainerModel.unlink({ container: ContainerModel.collection(linked), object: person });
    await db.flush();

    expect(linked.objects).toHaveLength(0);
    expect(Obj.getParent(person)?.id).toBe(owner.id);
  });

  test('a target that is not a collection persists the object without filing it', async ({ expect }) => {
    const { db } = await createDatabase();
    const person = Obj.make(Item, { name: 'alice' });
    // Stands in for a project.
    const target = db.add(Obj.make(Item, { name: 'target' }));
    await ContainerModel.add({ object: person, target }).pipe(Effect.provide(Database.layer(db)), Effect.runPromise);
    await db.flush();

    expect(Obj.getDatabase(person)).toBeDefined();
    const results = await db.query(ContainerModel.containing(person)).run();
    expect(results).toEqual([]);
  });
});
