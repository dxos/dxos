import { describe, test } from "@dxos/test";
import { EchoObject } from "./object";
import expect from 'expect'
import { ModelFactory } from "@dxos/model-factory";
import { ObjectModel } from "@dxos/object-model";
import { createInMemoryDatabase } from '@dxos/echo-db/testing'
import { EchoDatabase } from "./database";
import { sleep } from "@dxos/async";

const createTestDb = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createInMemoryDatabase(modelFactory);
  return new EchoDatabase(database);
}

describe("EchoDatabase", () => {
  test('get/set properties', async () => {
    const warpDb = await createTestDb();

    const obj = new EchoObject();
    obj.title = 'Test title';
    warpDb.save(obj);
    obj.description = 'Test description';

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await sleep(5);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  })

  test('initializer', async () => {
    const warpDb = await createTestDb();

    const obj = new EchoObject({
      title: 'Test title',
      description: 'Test description'
    });
    warpDb.save(obj);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');

    await sleep(5);

    expect(obj.title).toEqual('Test title');
    expect(obj.description).toEqual('Test description');
  })

  test('object refs', async () => {
    const warpDb = await createTestDb();

    const task = new EchoObject({
      title: 'Fix bugs',
    });
    warpDb.save(task);
    const john = new EchoObject({
      name: 'John Doe',
    });
    task.assignee = john;

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee).toEqual(john);

    await sleep(5);

    expect(task.title).toEqual('Fix bugs');
    expect(task.assignee instanceof EchoObject).toBeTruthy();
    expect(task.assignee).toEqual(john);
    expect(task.assignee.name).toEqual('John Doe');
  })
})