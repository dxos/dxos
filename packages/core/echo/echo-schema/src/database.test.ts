//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?
import { inspect } from 'node:util';

import { describe, test } from '@dxos/test';

import { data } from './defs';
import { createDatabase } from './testing';
import { TypedObject } from './typed-object';

// TODO(burdon): Normalize tests to use common graph data (see query.test.ts).

describe('Database', () => {
  test('adding and querying objects', async () => {
    const db = await createDatabase();

    const n = 10;
    for (const _ of Array.from({ length: n })) {
      const obj = new TypedObject();
      db.add(obj);
    }
    await db.flush();

    const { objects } = db.query();
    expect(objects).toHaveLength(n);
  });

  test('get/set properties', async () => {
    const db = await createDatabase();

    const obj = new TypedObject();
    obj.title = 'Test title';
    obj.description = 'Test description';
    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    db.add(obj);
    await db.flush();

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
    expect(obj[data]).toEqual({
      '@id': obj.id,
      '@type': undefined,
      '@model': 'dxos:model/document',
      title: 'Test title',
      description: 'Test description',
    });
  });

  test('get/set properties after save', async () => {
    const db = await createDatabase();

    const obj = new TypedObject();
    db.add(obj);
    await db.flush();

    obj.title = 'Test title';
    obj.description = 'Test description';

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('get/set reference after save', async () => {
    const db = await createDatabase();

    const obj = new TypedObject();
    db.add(obj);
    await db.flush();

    obj.nested = new TypedObject({ title: 'Test title' });
    expect(obj.nested.title).toEqual('Test title');
  });

  test('object constructor', async () => {
    const db = await createDatabase();

    const obj = new TypedObject({ title: 'Test title', description: 'Test description' });
    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    db.add(obj);
    await db.flush();

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('object refs', async () => {
    const db = await createDatabase();

    const task = new TypedObject({ title: 'Fix bugs' });
    const john = new TypedObject({ name: 'John Doe' });
    task.assignee = john;

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee).toEqual(john);

    db.add(task);
    await db.flush();

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee instanceof TypedObject).toBeTruthy();
    expect(task.assignee).toStrictEqual(john);
    expect(task.assignee.name).toEqual('John Doe');
  });

  test('nested props', async () => {
    const db = await createDatabase();

    const task = new TypedObject({ title: 'Fix bugs' });
    db.add(task);
    await db.flush();

    task.details = { priority: 'low' };
    task.details.deadline = '2021-01-01';
    expect(task.details.priority).toEqual('low');
    expect(task.details.deadline).toEqual('2021-01-01');
  });

  test('toJSON', async () => {
    const db = await createDatabase();

    const task = new TypedObject({
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: new TypedObject({ name: 'Bob' }),
    });
    db.add(task);
    await db.flush();

    expect(task.toJSON()).toEqual({
      '@id': task.id,
      '@type': undefined,
      '@model': 'dxos:model/document',
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: {
        '@id': task.assignee.id,
      },
    });
  });

  test('inspect', async () => {
    const db = await createDatabase();

    const task = new TypedObject({
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: new TypedObject({ name: 'Bob' }),
    });
    db.add(task);
    await db.flush();

    inspect(task);
    // console.log(task);
  });
});
