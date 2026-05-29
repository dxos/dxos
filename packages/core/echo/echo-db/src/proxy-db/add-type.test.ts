//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder } from '../testing';

const TestType = Schema.Struct({
  name: Schema.optional(Schema.String),
}).pipe(Type.makeObject(DXN.make('com.example.type.addType', '0.1.0')));

describe('Database.addType', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('persists a Type definition', async () => {
    const { db } = await builder.createDatabase();
    await db.addType(TestType);
    const types = await db.query(Filter.type(Type.Type)).run();
    expect(types).toHaveLength(1);
    expect(Type.getTypename(types[0])).to.eq(Type.getTypename(TestType));
  });

  test('is idempotent — adding the same type twice reuses the persisted entity', async () => {
    const { db } = await builder.createDatabase();
    const first = await db.addType(TestType);
    const second = await db.addType(TestType);
    expect(second.id).to.eq(first.id);
    const types = await db.query(Filter.type(Type.Type)).run();
    expect(types).toHaveLength(1);
  });

  test('db.add rejects Type entities', async () => {
    const { db } = await builder.createDatabase();
    expect(() => db.add(TestType as any)).to.throw();
  });

  test('objects can be created from a persisted type', async () => {
    const { db } = await builder.createDatabase();
    const type = await db.addType(TestType);
    const object = db.add(Obj.make(type, { name: 'Alice' }));
    expect(Type.getTypename(Obj.getType(object)!)).to.eq(Type.getTypename(TestType));

    const objects = await db.query(Filter.type(type)).run();
    expect(objects).toHaveLength(1);
    expect(objects[0].id).to.eq(object.id);
  });
});
