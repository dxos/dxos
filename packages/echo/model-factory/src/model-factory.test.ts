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
    const stateManager = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId);
    expect(stateManager.model).toBeTruthy();
  });

  test('model mutation processing', async () => {
    const itemId = createId();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const feedWriter = new MockFeedWriter<TestItemMutation>();
    const stateManager = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId, feedWriter as any);
    expect(stateManager.model).toBeTruthy();
    feedWriter.written.on(([message, meta]) => stateManager.processMessage({
      feedKey: meta.feedKey.asUint8Array(),
      memberKey: zeroKey(),
      seq: meta.seq
    }, message));

    // Update model.
    await stateManager.model.setProperty('title', 'Hello');
    expect(feedWriter.messages).toHaveLength(1);
    expect(feedWriter.messages[0]).toEqual({
      key: 'title',
      value: 'Hello'
    });

    // Expect model has not been updated (mutation has not been processed).
    // Expect model to have been updated.
    expect(stateManager.model.getProperty('title')).toEqual('Hello');
  });
});
