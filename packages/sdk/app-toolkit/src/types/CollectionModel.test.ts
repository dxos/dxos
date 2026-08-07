//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection, Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { TestSchema } from '@dxos/echo/testing';

import * as CollectionModel from './CollectionModel';

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
    Schema.Struct({ value: Schema.String }).pipe(HiddenAnnotation.set(true)),
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
