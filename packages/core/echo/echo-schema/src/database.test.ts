//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { describe, test } from '@dxos/test';

import { DatabaseRouter } from './database-router';
import { Document } from './document';
import { EchoArray } from './echo-array';
import { createDatabase } from './testing';
import { TextObject } from './text-object';

describe('EchoDatabase', () => {
  test('get/set properties', async () => {
    const db = await createDatabase();

    const obj = new Document();
    obj.title = 'Test title';
    obj.description = 'Test description';
    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await db.save(obj);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('initializer', async () => {
    const db = await createDatabase();

    const obj = new Document({ title: 'Test title', description: 'Test description' });
    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await db.save(obj);

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

    await db.save(task);

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee instanceof Document).toBeTruthy();
    expect(task.assignee).toStrictEqual(john);
    expect(task.assignee.name).toEqual('John Doe');
  });

  test('nested props', async () => {
    const db = await createDatabase();

    const task = new Document({ title: 'Fix bugs' });
    await db.save(task);

    task.details = { priority: 'low' };
    task.details.deadline = '2021-01-01';
    expect(task.details.priority).toEqual('low');
    expect(task.details.deadline).toEqual('2021-01-01');
  });

  test('select', async () => {
    const router = new DatabaseRouter();
    const db = await createDatabase(router);

    const task = new Document();
    await db.save(task);

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

  test('query', async () => {
    const db = await createDatabase();

    let counter = 0;
    const query = db.query({ category: 'eng' });
    query.subscribe(() => {
      ++counter;
    });
    expect(query.getObjects()).toEqual([]);

    const task1 = new Document({ category: 'eng', title: 'Task 1' });
    await db.save(task1);
    await waitForExpect(() => {
      expect(query.getObjects()).toEqual([task1]);
      expect(counter).toBeGreaterThanOrEqual(1);
    });

    const task2 = new Document({ category: 'legal', title: 'Task 2' });
    await db.save(task2);
    expect(query.getObjects()).toEqual([task1]);

    task2.category = 'eng';
    await waitForExpect(() => {
      expect(query.getObjects()).toEqual([task1, task2]);
      expect(counter).toBeGreaterThanOrEqual(2);
    });
  });

  describe('ordered arrays', async () => {
    test('array of sub documents', async () => {
      const db = await createDatabase();

      const task = new Document({ title: 'Main task' });
      await db.save(task);

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
  });

  describe('text', () => {
    test('basic', async () => {
      const db = await createDatabase();
      const text = new TextObject();
      await db.save(text);

      expect(text.doc).toBeDefined();
      expect(text.model).toBeDefined();
      expect(text.model!.textContent).toEqual('');

      text.model!.insert('Hello world', 0);
      expect(text.model!.textContent).toEqual('Hello world');
    });

    test('text property', async () => {
      const db = await createDatabase();
      const task = new Document();
      await db.save(task);

      task.text = new TextObject();

      // Populating the model is done asynchronously for now.
      await waitForExpect(() => {
        expect(task.text.doc).toBeDefined();
        expect(task.text.model).toBeDefined();
      });
      expect(task.text.model!.textContent).toEqual('');

      task.text.model!.insert('Hello world', 0);
      expect(task.text.model!.textContent).toEqual('Hello world');
    });
  });
});
