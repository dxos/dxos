import { describe, test } from "@dxos/test";
import { WarpObject } from "./warp-object";
import expect from 'expect'
import { ModelFactory } from "@dxos/model-factory";
import { ObjectModel } from "@dxos/object-model";
import { createInMemoryDatabase } from '@dxos/echo-db/testing'
import { WarpDatabase } from "./warp-database";
import { sleep } from "@dxos/async";

describe("WarpDatabase", () => {
  test('get/set properties', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const database = await createInMemoryDatabase(modelFactory);
    const warpDb = new WarpDatabase(database);

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
})