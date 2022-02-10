//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createModelTestBench } from '@dxos/echo-db';
import { MockFeedWriter } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { TextModel } from './text-model';

describe('TextModel', () => {
  test('insert', async () => {
    const { items: [item1, item2], peers } = await createModelTestBench({ model: TextModel });
    after(async () => Promise.all(peers.map(peer => peer.close())));

    item1.model.insert(0, 'Hello World!');

    await item2.model.update.waitForCount(1);
    expect(item2.model.textContent).toBe('Hello World!');

    // TODO(burdon): Test delete.
    const words = item1.model.textContent.split(' ');
    item2.model.insert(words[0].length, ' DXOS');
    await item1.model.update.waitForCount(1);
    expect(item1.model.textContent).toBe('Hello DXOS World!');

    // TODO(burdon): Errors. Race condition?
    // code for await (const peer of peers) {
    // code   await peer.close();
    // code }
  });

  test('snapshot', async () => {
    const modelFactory = new ModelFactory().registerModel(TextModel);
    const model1 = modelFactory.createModel<TextModel>(TextModel.meta.type, 'test', {}, new MockFeedWriter());

    model1.model.insert(0, 'Hello World!');

    const snapshot = model1.createSnapshot();

    const model2 = modelFactory.createModel<TextModel>(TextModel.meta.type, 'test', snapshot, new MockFeedWriter());

    expect(model2.model.textContent).toBe('Hello World!');
  });

  test('conflict', async () => {
    const { items: [item1, item2], peers } = await createModelTestBench({ model: TextModel });
    after(async () => Promise.all(peers.map(peer => peer.close())));

    // code item1.model.update.on(() => console.log(`m1 ${item1.model.textContent}`));
    // code item2.model.update.on(() => console.log(`m2 ${item2.model.textContent}`));

    item1.model.insert(0, 'Hello');
    await item2.model.update.waitForCount(1);

    const updatesPromise = Promise.all([
      item1.model.update.waitForCount(2),
      item2.model.update.waitForCount(2)
    ]);

    item1.model.insert(5, '!');
    item2.model.insert(5, '?');

    await updatesPromise;

    expect(item1.model.textContent).toBe(item2.model.textContent);
  });
});
