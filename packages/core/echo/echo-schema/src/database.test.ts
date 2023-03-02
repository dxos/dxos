//
// Copyright 2022 DXOS.org
//

import expect from 'expect'; // TODO(burdon): Convert to chai.
import { inspect } from 'node:util';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { describe, test } from '@dxos/test';

import { DatabaseRouter } from './database-router';
import { data } from './defs';
import { Document } from './document';
import { EchoArray } from './echo-array';
import { createDatabase } from './testing';
import { Text } from './text-object';

describe('EchoDatabase', () => {
  test('get/set properties', async () => {
    const db = await createDatabase();

    const obj = new Document();
    obj.title = 'Test title';
    obj.description = 'Test description';
    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await db.add(obj);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
    expect(obj[data]).toEqual({
      '@id': obj.id,
      '@type': undefined,
      '@model': 'dxos:model/document',
      title: 'Test title',
      description: 'Test description'
    });
  });

  test('get/set properties after save', async () => {
    const db = await createDatabase();

    const obj = new Document();
    await db.add(obj);

    obj.title = 'Test title';
    obj.description = 'Test description';

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('get/set reference after save', async () => {
    const db = await createDatabase();

    const obj = new Document();
    await db.add(obj);

    obj.nested = new Document({ title: 'Test title' });
    expect(obj.nested.title).toEqual('Test title');
  });

  test('initializer', async () => {
    const db = await createDatabase();

    const obj = new Document({ title: 'Test title', description: 'Test description' });
    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await db.add(obj);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('object refs', async () => {
    const db = await createDatabase();

    const task = new Document({ title: 'Fix bugs' });
    const john = new Document({ name: 'John Doe' });
    task.assignee = john;

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee).toEqual(john);

    await db.add(task);

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee instanceof Document).toBeTruthy();
    expect(task.assignee).toStrictEqual(john);
    expect(task.assignee.name).toEqual('John Doe');
  });

  test('nested props', async () => {
    const db = await createDatabase();

    const task = new Document({ title: 'Fix bugs' });
    await db.add(task);

    task.details = { priority: 'low' };
    task.details.deadline = '2021-01-01';
    expect(task.details.priority).toEqual('low');
    expect(task.details.deadline).toEqual('2021-01-01');
  });

  describe('subscription', () => {
    test('updates are propagated', async () => {
      const router = new DatabaseRouter();
      const db = await createDatabase(router);

      const task = new Document();
      await db.add(task);

      let counter = 0;
      const selection = router.createSubscription(() => {
        counter++;
      });
      selection.update([task]);

      task.title = 'Test title';
      await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(1));

      task.assignee = new Document({ name: 'user-1' });
      await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(2));

      task.assignee.name = 'user-2';
      selection.update([task, task.assignee]);

      task.assignee.name = 'user-3';
      await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(3));
    });

    test('updates are synchronous', async () => {
      const router = new DatabaseRouter();
      const db = await createDatabase(router);

      const task = new Document();
      await db.add(task);

      const actions: string[] = [];
      const selection = router.createSubscription(() => {
        actions.push('update');
      });
      selection.update([task]);
      // Initial update caused by changed selection.
      expect(actions).toEqual(['update']);

      actions.push('before');
      task.title = 'Test title';
      actions.push('after');

      // NOTE: This order is required for input components in react to function properly when directly bound to ECHO objects.
      expect(actions).toEqual(['update', 'before', 'update', 'after']);
    });
  });

  test('query', async () => {
    const db = await createDatabase();

    let counter = 0;
    const query = db.query({ category: 'eng' });
    query.subscribe(() => {
      ++counter;
    });
    expect(query.objects).toEqual([]);

    const task1 = new Document({ category: 'eng', title: 'Task 1' });
    await db.add(task1);
    expect(query.objects).toEqual([task1]);
    expect(counter).toBeGreaterThanOrEqual(1);

    const task2 = new Document({ category: 'legal', title: 'Task 2' });
    await db.add(task2);
    expect(query.objects).toEqual([task1]);

    task2.category = 'eng';
    expect(query.objects).toEqual([task1, task2]);
    expect(counter).toBeGreaterThanOrEqual(2);
  });

  test('toJSON', async () => {
    const db = await createDatabase();

    const task = new Document({
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: new Document({ name: 'Bob' })
    });
    await db.add(task);

    expect(task.toJSON()).toEqual({
      '@id': task.id,
      '@type': undefined,
      '@model': 'dxos:model/document',
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: {
        '@id': task.assignee.id
      }
    });
  });

  test('inspect', async () => {
    const db = await createDatabase();

    const task = new Document({
      title: 'Main task',
      tags: ['red', 'green'],
      assignee: new Document({ name: 'Bob' })
    });
    await db.add(task);

    inspect(task);
    // console.log(task);
  });

  describe('ordered arrays', () => {
    test('array of tags', async () => {
      const db = await createDatabase();

      const task = new Document({ title: 'Main task' });
      await db.add(task);

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
      const db = await createDatabase();

      const task = new Document({ title: 'Main task' });
      await db.add(task);

      task.subtasks = new EchoArray();
      task.subtasks.push(new Document({ title: 'Subtask 1' }));
      task.subtasks.push(new Document({ title: 'Subtask 2' }));
      task.subtasks.push(new Document({ title: 'Subtask 3' }));

      expect(task.subtasks.length).toEqual(3);
      expect(task.subtasks[0].title).toEqual('Subtask 1');
      expect(task.subtasks[1].title).toEqual('Subtask 2');
      expect(task.subtasks[2].title).toEqual('Subtask 3');

      const titles = task.subtasks.map((subtask: Document) => subtask.title);
      expect(titles).toEqual(['Subtask 1', 'Subtask 2', 'Subtask 3']);

      task.subtasks[0] = new Document({ title: 'New subtask 1' });
      expect(task.subtasks.map((subtask: Document) => subtask.title)).toEqual([
        'New subtask 1',
        'Subtask 2',
        'Subtask 3'
      ]);
    });

    test('assign a plain array', async () => {
      const db = await createDatabase();

      const task = new Document({ title: 'Main task' });
      await db.add(task);

      task.tags = ['red', 'green', 'blue'];
      expect(task.tags instanceof EchoArray).toBeTruthy();
      expect(task.tags.length).toEqual(3);
      expect(task.tags.slice()).toEqual(['red', 'green', 'blue']);

      task.tags[1] = 'yellow';
      expect(task.tags.slice()).toEqual(['red', 'yellow', 'blue']);
    });

    test('empty array', async () => {
      const db = await createDatabase();

      const task = new Document({ title: 'Main task' });
      await db.add(task);

      task.tags = [];
      expect(task.tags instanceof EchoArray).toBeTruthy();
      expect(task.tags.length).toEqual(0);
    });

    test('importing arrays into a database', async () => {
      const db = await createDatabase();

      const root = new Document({ title: 'Main task' });
      root.array = [new Document({ title: 'Subtask 1' }), 'red'];
      expect(root.array.length).toEqual(2);
      expect(root.array[0].title).toEqual('Subtask 1');
      expect(root.array[1]).toEqual('red');

      await db.add(root);

      expect(root.array.length).toEqual(2);
      expect(root.array[0].title).toEqual('Subtask 1');
      expect(root.array[1]).toEqual('red');

      const { objects } = db.query();
      expect(objects).toContain(root.array[0]);
    });

    test('importing empty arrays into a database', async () => {
      const db = await createDatabase();

      const root = new Document();
      root.array = [];
      expect(root.array.length).toEqual(0);

      await db.add(root);

      expect(root.array.length).toEqual(0);
    });
  });

  describe('text', () => {
    test('basic', async () => {
      const db = await createDatabase();
      const text = new Text();
      await db.add(text);

      expect(text.doc).toBeDefined();
      expect(text.text).toEqual('');

      text.model!.insert('Hello world', 0);
      expect(text.text).toEqual('Hello world');
    });

    test('text property', async () => {
      const db = await createDatabase();
      const task = new Document();
      await db.add(task);
      task.text = new Text();
      await sleep(10);
      expect(task.text.doc).toBeDefined();
      expect(task.text.model).toBeDefined();
      expect(task.text.text).toEqual('');

      task.text.model!.insert('Hello world', 0);
      expect(task.text.text).toEqual('Hello world');
    });
  });
});
