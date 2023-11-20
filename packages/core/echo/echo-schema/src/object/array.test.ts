//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Can't use chai with wait-for-expect?

import { describe, test } from '@dxos/test';

import { EchoArray } from './array';
import { Expando, TypedObject } from './typed-object';
import { createDatabase, testWithAutomerge } from '../testing';

describe('Arrays', () => {
  test('array of tags', async () => {
    const { db } = await createDatabase();

    const task = new TypedObject({ title: 'Main task' });
    db.add(task);
    await db.flush();

    task.tags = new EchoArray();
    task.tags.push('red');
    task.tags.push('green');
    task.tags.push('blue');
    expect(task.tags.length).toEqual(3);
    expect(task.tags.slice()).toEqual(['red', 'green', 'blue']);
    expect(task.tags[0]).toEqual('red');
    expect(task.tags[1]).toEqual('green');

    task.tags[1] = 'yellow';
    expect(task.tags.slice()).toEqual(['red', 'yellow', 'blue']);

    task.tags.splice(1, 0, 'magenta');
    expect(task.tags.slice()).toEqual(['red', 'magenta', 'yellow', 'blue']);

    // Move yellow before magenta
    task.tags.splice(2, 1);
    task.tags.splice(1, 0, 'yellow');
    expect(task.tags.slice()).toEqual(['red', 'yellow', 'magenta', 'blue']);
  });
  test('array of sub documents', async () => {
    const { db } = await createDatabase();

    const task = new TypedObject({ title: 'Main task' });
    db.add(task);
    await db.flush();

    task.subtasks = new EchoArray();
    task.subtasks.push(new TypedObject({ title: 'Subtask 1' }));
    task.subtasks.push(new TypedObject({ title: 'Subtask 2' }));
    task.subtasks.push(new TypedObject({ title: 'Subtask 3' }));

    expect(task.subtasks.length).toEqual(3);
    expect(task.subtasks[0].title).toEqual('Subtask 1');
    expect(task.subtasks[1].title).toEqual('Subtask 2');
    expect(task.subtasks[2].title).toEqual('Subtask 3');

    const titles = task.subtasks.map((subtask: TypedObject) => subtask.title);
    expect(titles).toEqual(['Subtask 1', 'Subtask 2', 'Subtask 3']);

    task.subtasks[0] = new TypedObject({ title: 'New subtask 1' });
    expect(task.subtasks.map((subtask: TypedObject) => subtask.title)).toEqual([
      'New subtask 1',
      'Subtask 2',
      'Subtask 3',
    ]);
  });

  test('assign a plain array', async () => {
    const { db } = await createDatabase();

    const task = new TypedObject({ title: 'Main task' });
    db.add(task);
    await db.flush();

    task.tags = ['red', 'green', 'blue'];
    expect(task.tags instanceof EchoArray).toBeTruthy();
    expect(task.tags.length).toEqual(3);
    expect(task.tags.slice()).toEqual(['red', 'green', 'blue']);

    task.tags[1] = 'yellow';
    expect(task.tags.slice()).toEqual(['red', 'yellow', 'blue']);
  });

  test('empty array', async () => {
    const { db } = await createDatabase();

    const task = new TypedObject({ title: 'Main task' });
    db.add(task);
    await db.flush();

    task.tags = [];
    expect(task.tags instanceof EchoArray).toBeTruthy();
    expect(task.tags.length).toEqual(0);
  });

  test('importing arrays into a database', async () => {
    const { db } = await createDatabase();

    const root = new TypedObject({ title: 'Main task' });
    root.array = [new TypedObject({ title: 'Subtask 1' }), 'red'];
    expect(root.array.length).toEqual(2);
    expect(root.array[0].title).toEqual('Subtask 1');
    expect(root.array[1]).toEqual('red');

    db.add(root);
    await db.flush();

    expect(root.array.length).toEqual(2);
    expect(root.array[0].title).toEqual('Subtask 1');
    expect(root.array[1]).toEqual('red');

    const { objects } = db.query();
    expect(objects).toContain(root.array[0]);
  });

  test('importing empty arrays into a database', async () => {
    const { db } = await createDatabase();

    const root = new TypedObject();
    root.array = [];
    expect(root.array.length).toEqual(0);

    db.add(root);
    await db.flush();

    expect(root.array.length).toEqual(0);
  });

  test('reset array', async () => {
    const { db } = await createDatabase();
    const root = db.add(new Expando());
    await db.flush();
    root.records = ['one'];
    expect(root.records).toHaveLength(1);

    root.records = [];
    expect(root.records).toHaveLength(0);

    await db.flush();
    expect(root.records).toHaveLength(0);

    root.records.push({ title: 'two' });
    expect(root.records).toHaveLength(1);

    await db.flush();
    expect(root.records).toHaveLength(1);
  });
});
