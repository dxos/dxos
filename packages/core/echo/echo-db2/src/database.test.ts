//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { describe, test } from '@dxos/test';

import { EchoDatabase } from './database';
import { EchoObject } from './object';
import { OrderedSet } from './ordered-array';

const createDatabase = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createMemoryDatabase(modelFactory);
  return new EchoDatabase(database);
};

describe('EchoDatabase', () => {
  test('get/set properties', async () => {
    const db = await createDatabase();

    const obj = new EchoObject();
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

    const obj = new EchoObject({
      title: 'Test title',
      description: 'Test description'
    });
    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await db.save(obj);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('object refs', async () => {
    const db = await createDatabase();

    const task = new EchoObject({ title: 'Fix bugs' });
    const john = new EchoObject({ name: 'John Doe' });
    task.assignee = john;

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee).toEqual(john);

    await db.save(task);

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee instanceof EchoObject).toBeTruthy();
    expect(task.assignee).toStrictEqual(john);
    expect(task.assignee.name).toEqual('John Doe');
  });

  test('nested props', async () => {
    const db = await createDatabase();

    const task = new EchoObject({ title: 'Fix bugs' });
    await db.save(task);

    task.details = { priority: 'low' };
    task.details.deadline = '2021-01-01';
    expect(task.details.priority).toEqual('low');
    expect(task.details.deadline).toEqual('2021-01-01');
  });

  test('ordered arrays', async () => {
    const db = await createDatabase();

    const task = new EchoObject({ title: 'Main task' });
    await db.save(task);

    task.subtasks = new OrderedSet();
    task.subtasks.push(new EchoObject({ title: 'Subtask 1' }));
    task.subtasks.push(new EchoObject({ title: 'Subtask 2' }));
    task.subtasks.push(new EchoObject({ title: 'Subtask 3' }));

    expect(task.subtasks.length).toEqual(3);
    expect(task.subtasks[0].title).toEqual('Subtask 1');
    expect(task.subtasks[1].title).toEqual('Subtask 2');
    expect(task.subtasks[2].title).toEqual('Subtask 3');

    const titles = task.subtasks.map((subtask: EchoObject) => subtask.title);
    expect(titles).toEqual(['Subtask 1', 'Subtask 2', 'Subtask 3']);

    task.subtasks[0] = new EchoObject({ title: 'New subtask 1' });
    expect(task.subtasks.map((subtask: EchoObject) => subtask.title)).toEqual([
      'New subtask 1',
      'Subtask 2',
      'Subtask 3'
    ]);
  });

  test('select', async () => {
    const db = await createDatabase();

    const task = new EchoObject();
    await db.save(task);

    let counter = 0;
    const selection = db.createSubscription(() => {
      counter++;
    });
    selection.update([task]);

    task.title = 'Test title';
    await waitForExpect(() => expect(counter).toBeGreaterThanOrEqual(1));

    task.assignee = new EchoObject({ name: 'user-1' });
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

    const task1 = new EchoObject({ category: 'eng', title: 'Task 1' });
    await db.save(task1);
    await waitForExpect(() => {
      expect(query.getObjects()).toEqual([task1]);
      expect(counter).toBeGreaterThanOrEqual(1);
    });

    const task2 = new EchoObject({ category: 'legal', title: 'Task 2' });
    await db.save(task2);
    expect(query.getObjects()).toEqual([task1]);

    task2.category = 'eng';
    await waitForExpect(() => {
      expect(query.getObjects()).toEqual([task1, task2]);
      expect(counter).toBeGreaterThanOrEqual(2);
    });
  });
});
