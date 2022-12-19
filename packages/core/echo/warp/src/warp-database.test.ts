import { describe, test } from "@dxos/test";
import { WarpObject } from "./warp-object";
import expect from 'expect'
import { ModelFactory } from "@dxos/model-factory";
import { ObjectModel } from "@dxos/object-model";
import { createInMemoryDatabase } from '@dxos/echo-db/testing'
import { WarpDatabase } from "./warp-database";
import { sleep } from "@dxos/async";

const createTestDb = async () => {
  const modelFactory = new ModelFactory().registerModel(ObjectModel);
  const database = await createInMemoryDatabase(modelFactory);
  return new WarpDatabase(database);
}

describe("WarpDatabase", () => {
  test('get/set properties', async () => {
    const warpDb = await createTestDb();

    const obj = new WarpObject();
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

    const obj = new WarpObject({
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

  test.skip('object refs', async () => {
    const warpDb = await createTestDb();

    const task = new WarpObject();
    task.title = 'Test title';
    warpDb.save(task);
    task.description = 'Test description';

    expect(task.title).toEqual('Test title');
    expect(task.description).toEqual('Test description');

    await sleep(5);

    expect(task.title).toEqual('Test title');
    expect(task.description).toEqual('Test description');
  })
})