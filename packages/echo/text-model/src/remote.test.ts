import { createInMemoryDatabase, createRemoteDatabaseFromDataServiceHost } from '@dxos/echo-db';
import { ModelFactory } from '@dxos/model-factory';
import { it as test } from 'mocha';
import { TextModel } from './text-model';

describe('With remote database', () => {
  test('create and write text', async () => {
    const modelFactory = new ModelFactory().registerModel(TextModel);
    const backend = await createInMemoryDatabase(modelFactory);
    const frontend = await createRemoteDatabaseFromDataServiceHost(modelFactory, backend.createDataServiceHost());

    const text = await frontend.createItem({
      model: TextModel, type: 'example:type.text'
    });
    await text.model.insert(0, 'Hello world');

    expect(text.model.textContent).toEqual('Hello world');
  })
})