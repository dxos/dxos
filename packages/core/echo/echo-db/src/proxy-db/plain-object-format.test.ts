//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { create, S, TypedObject } from '@dxos/echo-schema';
import { DXN } from '@dxos/keys';

import { Filter, ResultFormat } from '../query';
import { EchoTestBuilder } from '../testing';
import { Task } from '@dxos/echo-schema/testing';

describe('Plain object format', () => {
  test('can query and mutate data', async () => {
    await using testBuilder = await new EchoTestBuilder().open();
    const { db } = await testBuilder.createDatabase();

    const { id } = await db.insert({ kind: 'task', title: 'A' });
    await db.flush({ indexes: true });

    {
      const { objects } = await db.query(Filter.all(), { format: ResultFormat.Plain }).run();
      expect(objects).to.deep.eq([
        {
          id,
          __typename: null,
          __meta: {
            keys: [],
          },
          kind: 'task',
          title: 'A',
        },
      ]);
    }

    await db.update(
      {
        id,
      },
      {
        title: 'B',
      },
    );

    {
      const { objects } = await db.query(Filter.all(), { format: ResultFormat.Plain }).run();
      expect(objects).to.deep.eq([
        {
          id,
          __typename: null,
          __meta: {
            keys: [],
          },
          kind: 'task',
          title: 'B',
        },
      ]);
    }
  });

  test('query with JSON filter', async () => {
    await using testBuilder = await new EchoTestBuilder().open();
    const { db } = await testBuilder.createDatabase();

    await db.insert([
      { __typename: Task.typename, title: 'Task 1', completed: true },
      {
        __typename: Task.typename,
        title: 'Task 2',
        completed: false,
      },
      { __typename: Task.typename, title: 'Task 3', completed: true },
    ]);
    await db.flush({ indexes: true });

    {
      const { objects } = await db.query({ __typename: Task.typename }, { format: ResultFormat.Plain }).run();
      expect(objects.length).to.eq(3);
    }

    {
      const { objects } = await db
        .query({ __typename: Task.typename, completed: true }, { format: ResultFormat.Plain })
        .run();
      expect(objects.length).to.eq(2);
    }
  });

  test('query by id', async () => {
    await using testBuilder = await new EchoTestBuilder().open();
    const { db } = await testBuilder.createDatabase();

    const [{ id: id1 }] = await db.insert([
      { __typename: Task.typename, title: 'Task 1', completed: true },
      {
        __typename: Task.typename,
        title: 'Task 2',
        completed: false,
      },
    ]);
    await db.flush({ indexes: true });

    {
      const { objects } = await db.query({ id: id1 }, { format: ResultFormat.Plain }).run();
      expect(objects.length).to.eq(1);
      expect(objects[0].id).to.eq(id1);
    }

    {
      const object = await db.query({ id: id1 }, { format: ResultFormat.Plain }).first();
      expect(object.id).to.eq(id1);
    }
  });

  test('insert typed objects & interop with proxies', async () => {
    await using testBuilder = await new EchoTestBuilder().open();
    const { db } = await testBuilder.createDatabase();

    const { id } = await db.insert({ __typename: Task.typename, title: 'A' });
    await db.insert({ data: 'foo' }); // random object
    await db.flush({ indexes: true });

    {
      const { objects } = await db.query({ __typename: Task.typename }, { format: ResultFormat.Plain }).run();
      expect(objects.length).to.eq(1);
      expect(objects[0].id).to.eq(id);
    }

    {
      const { objects } = await db.query(Filter.schema(Task)).run();
      expect(objects.length).to.eq(1);
      expect(objects[0].id).to.eq(id);
    }
  });

  test('references in plain object notation', async () => {
    await using testBuilder = await new EchoTestBuilder().open();
    const { db } = await testBuilder.createDatabase();

    const { id: id1 } = await db.insert({ title: 'Inner' });
    const { id: id2 } = await db.insert({ title: 'Outer', inner: { '/': id1 } });
    await db.flush({ indexes: true });

    {
      const object = await db.query({ id: id2 }, { format: ResultFormat.Plain }).first();
      expect(object).to.deep.eq({
        id: id2,
        __typename: null,
        __meta: {
          keys: [],
        },
        title: 'Outer',
        inner: { '/': `dxn:echo:@:${id1}` },
      });

      const inner = await db.query({ id: object.inner }, { format: ResultFormat.Plain }).first();
      expect(inner).to.deep.eq({
        id: id1,
        __typename: null,
        __meta: {
          keys: [],
        },
        title: 'Inner',
      });
    }
  });

  test('query with join', async () => {
    await using testBuilder = await new EchoTestBuilder().open();
    const { db } = await testBuilder.createDatabase();

    const { id: id1 } = await db.insert({ title: 'Inner' });
    const { id: id2 } = await db.insert({ title: 'Inner', nested: { '/': id1 } });
    const { id: id3 } = await db.insert({ title: 'Outer', inner: { '/': id2 } });
    await db.flush({ indexes: true });

    {
      const object = await db
        .query({ id: id3 }, { format: ResultFormat.Plain, include: { inner: { nested: true } } })
        .first();
      expect(object).to.deep.eq({
        id: id3,
        __typename: null,
        __meta: {
          keys: [],
        },
        title: 'Outer',
        inner: {
          id: id2,
          __typename: null,
          __meta: {
            keys: [],
          },
          title: 'Inner',
          nested: {
            id: id1,
            __typename: null,
            __meta: {
              keys: [],
            },
            title: 'Inner',
          },
        },
      });
    }
  });

  test('dynamic schema objects', async () => {
    await using testBuilder = await new EchoTestBuilder().open();
    const { db } = await testBuilder.createDatabase();

    class TestSchema extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
      field: S.String,
    }) {}

    const stored = db.schemaRegistry.addSchema(TestSchema);
    const schemaDxn = DXN.fromLocalObjectId(stored.id).toString();

    const object = db.add(create(stored, { field: 'test' }));
    await db.flush({ indexes: true });

    const { objects } = await db.query({ __typename: schemaDxn }, { format: ResultFormat.Plain }).run();
    expect(objects).toEqual([
      {
        id: object.id,
        __typename: schemaDxn,
        __meta: {
          keys: [],
        },
        field: 'test',
      },
    ]);
  });
});
