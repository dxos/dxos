//
// Copyright 2020 DXOS.org
//

import { createId, zeroKey } from '@dxos/crypto';
import { MockFeedWriter, TestItemMutation } from '@dxos/echo-protocol';

import { ModelFactory } from './model-factory';
import { TestModel } from './testing';

describe('model factory', () => {
  test('model constructor', async () => {
    const itemId = createId();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const model = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId);
    expect(model).toBeTruthy();
  });

  test('model mutation processing', async () => {
    const itemId = createId();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const feedWriter = new MockFeedWriter<TestItemMutation>();
    const model = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId, feedWriter as any);
    expect(model).toBeTruthy();
    feedWriter.written.on(([message, meta]) => model.processMessage({
      feedKey: meta.feedKey.asUint8Array(),
      memberKey: zeroKey(),
      seq: meta.seq
    }, message));

    // Update model.
    await model.setProperty('title', 'Hello');
    expect(feedWriter.messages).toHaveLength(1);
    expect(feedWriter.messages[0]).toEqual({
      key: 'title',
      value: 'Hello'
    });

    // Expect model has not been updated (mutation has not been processed).
    // Expect model to have been updated.
    expect(model.getProperty('title')).toEqual('Hello');
  });
});
