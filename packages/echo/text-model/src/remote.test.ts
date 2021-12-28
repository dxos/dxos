import { createInMemoryDatabase, createRemoteDatabaseFromDataServiceHost } from '@dxos/echo-db';
import { ModelFactory } from '@dxos/model-factory';
import { it as test } from 'mocha';
import { TextModel } from './text-model';
import expect from 'expect';
import { ObjectModel } from '@dxos/object-model';

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

  test('create with parent', async () => {
    const modelFactory = new ModelFactory().registerModel(TextModel).registerModel(ObjectModel);
    const backend = await createInMemoryDatabase(modelFactory);
    const frontend = await createRemoteDatabaseFromDataServiceHost(modelFactory, backend.createDataServiceHost());

    const parent = await frontend.createItem({
      model: ObjectModel,
    });

    const text = await frontend.createItem({
      model: TextModel,
      type: 'example:type.text',
      parent: parent.id,
    });
    await text.model.insert(0, 'Hello world');

    expect(text.model.textContent).toEqual('Hello world');
  })
})