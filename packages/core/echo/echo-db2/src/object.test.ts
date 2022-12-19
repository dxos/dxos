import { describe, test } from "@dxos/test";
import { EchoObject } from "./object";
import expect from 'expect'
import { ModelFactory } from "@dxos/model-factory";
import { ObjectModel } from "@dxos/object-model";
import { createInMemoryDatabase } from '@dxos/echo-db/testing'

describe("WarpObject", () => {
  test('instance of', async () => {
    const modelFactory = new ModelFactory().registerModel(ObjectModel);
    const database = await createInMemoryDatabase(modelFactory);

    const obj = new EchoObject();
    expect(obj instanceof EchoObject).toBeTruthy();
  })
})