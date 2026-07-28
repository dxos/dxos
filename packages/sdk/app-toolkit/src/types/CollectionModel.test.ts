//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
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
