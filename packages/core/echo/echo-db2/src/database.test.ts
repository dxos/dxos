//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import waitForExpect from 'wait-for-expect';

import { sleep } from '@dxos/async';
import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { describe, test } from '@dxos/test';

import { EchoDatabase } from './database';
import { EchoObject } from './object';
import { OrderedArray } from './ordered-array';

const createTestDb = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createMemoryDatabase(modelFactory);
  return new EchoDatabase(database);
};

describe('EchoDatabase', () => {
  test('get/set properties', async () => {
    const db = await createTestDb();

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
    const db = await createTestDb();

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
    const warpDb = await createTestDb();

    const task = new EchoObject({
      title: 'Fix bugs'
    });
    const john = new EchoObject({
      name: 'John Doe'
    });
    task.assignee = john;
    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee).toEqual(john);

    await warpDb.save(task);

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee instanceof EchoObject).toBeTruthy();
    expect(task.assignee).toStrictEqual(john);
    expect(task.assignee.name).toEqual('John Doe');
  });

  test('nested props', async () => {
    const warpDb = await createTestDb();

    const task = new EchoObject({
      title: 'Fix bugs'
    });
    await warpDb.save(task);

    task.details = {
      priority: 'low'
    };
    task.details.deadline = '2021-01-01';
    expect(task.details.priority).toEqual('low');
    expect(task.details.deadline).toEqual('2021-01-01');
  });

  test('ordered arrays', async () => {
    const warpDb = await createTestDb();

    const task = new EchoObject({ title: 'Main task' });
    await warpDb.save(task);

    task.subtasks = new OrderedArray();
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

  test.skip('subscribe', async () => {
    const db = await createTestDb();

    const task = new EchoObject({
      project: new EchoObject({ name: 'DXOS' })
    });

    await db.save(task);

    let counter = 0;
    const expectCount = (count: number) =>
      waitForExpect(() => {
        expect(counter).toEqual(count);
      });

    const unsubscribe = db.subscribe(
      (touch) => touch(task).assignee,
      () => counter++
    );

    task.title = 'Test title';
    await expectCount(1);

    task.assignee = new EchoObject({ name: 'John' });
    await expectCount(2);

    task.assignee.name = 'Jake';
    await expectCount(3);

    task.project.name = 'Braneframe';
    await sleep(10);
    await expectCount(3);

    unsubscribe();
  });
});
