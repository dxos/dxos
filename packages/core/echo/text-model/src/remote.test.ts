//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import {
  createInMemoryDatabase,
  createRemoteDatabaseFromDataServiceHost
} from '@dxos/echo-db';
import { ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

import { TextModel } from './text-model';

describe('With remote database', function () {
  it('create and write text', async function () {
    const modelFactory = new ModelFactory().registerModel(TextModel);
    const backend = await createInMemoryDatabase(modelFactory);
    const frontend = await createRemoteDatabaseFromDataServiceHost(
      modelFactory,
      backend.createDataServiceHost()
    );

    const text = await frontend.createItem({
      model: TextModel,
      type: 'example:type/text'
    });
    await text.model.insert('Hello world', 0);

    expect(text.model.textContent).toEqual('Hello world');
  });

  it('create with parent', async function () {
    const modelFactory = new ModelFactory()
      .registerModel(TextModel)
      .registerModel(ObjectModel);
    const backend = await createInMemoryDatabase(modelFactory);
    const frontend = await createRemoteDatabaseFromDataServiceHost(
      modelFactory,
      backend.createDataServiceHost()
    );

    const parent = await frontend.createItem({
      model: ObjectModel
    });

    const text = await frontend.createItem({
      model: TextModel,
      type: 'example:type/text',
      parent: parent.id
    });
    await text.model.insert('Hello world', 0);

    expect(text.model.textContent).toEqual('Hello world');
  });
});
