//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { sleep } from '@dxos/async';
import { createMemoryDatabase } from '@dxos/echo-db/testing';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { describe, test } from '@dxos/test';

import { EchoDatabase } from './database';
import { EchoObject } from './object';

const createTestDb = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createMemoryDatabase(modelFactory);
  return new EchoDatabase(database);
};

describe('EchoDatabase', () => {
  test('get/set properties', async () => {
    const warpDb = await createTestDb();

    const obj = new EchoObject();
    obj.title = 'Test title';
    warpDb.save(obj);
    obj.description = 'Test description';

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await sleep(10);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('initializer', async () => {
    const warpDb = await createTestDb();

    const obj = new EchoObject({
      title: 'Test title',
      description: 'Test description'
    });
    warpDb.save(obj);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await sleep(10);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  });

  test('object refs', async () => {
    const warpDb = await createTestDb();

    const task = new EchoObject({
      title: 'Fix bugs'
    });
    warpDb.save(task);
    const john = new EchoObject({
      name: 'John Doe'
    });
    task.assignee = john;

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee).toEqual(john);

    await sleep(10);

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee instanceof EchoObject).toBeTruthy();
    expect(task.assignee).toStrictEqual(john);
    expect(task.assignee.name).toEqual('John Doe');
  });
});
