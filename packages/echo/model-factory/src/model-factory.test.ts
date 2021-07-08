//
// Copyright 2020 DXOS.org
//

import { latch } from '@dxos/async';
import { createId, createKeyPair } from '@dxos/crypto';
import { TestItemMutation, createMockFeedWriterFromStream, Timeframe } from '@dxos/echo-protocol';
import { createTransform } from '@dxos/util';

import { ModelFactory } from './model-factory';
import { TestModel } from './testing';
import { ModelMessage } from './types';

describe('model factory', () => {
  test('model constructor', async () => {
    const itemId = createId();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const model = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId);
    expect(model).toBeTruthy();
  });

  test('model mutation processing', async () => {
    const { publicKey: feedKey } = createKeyPair();
    const itemId = createId();

    const objects: TestItemMutation[] = [];

    // Transform outbound mutations to inbounds model messsges (create loop).
    const writeStream = createTransform<TestItemMutation, ModelMessage<TestItemMutation>>(
      async mutation => {
        objects.push(mutation);
        const out: ModelMessage<TestItemMutation> = {
          meta: {
            memberKey: feedKey,
            feedKey,
            seq: 1,
            timeframe: new Timeframe(),
          },
          mutation
        };

        return out;
      }
    );

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel);
    const model = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId, createMockFeedWriterFromStream(writeStream));
    expect(model).toBeTruthy();

    // Update model.
    await model.setProperty('title', 'Hello');
    expect(objects).toHaveLength(1);
    expect(objects[0]).toEqual({
      key: 'title',
      value: 'Hello'
    });

    // Expect model has not been updated (mutation has not been processed).
    expect(model.getProperty('title')).toBeFalsy();

    // Listen for updates.
    const [update, onUpdate] = latch(1);
    model.subscribe(onUpdate);

    // Loop model output to input.
    writeStream.pipe(model.processor);

    // Wait for message to be processed.
    await update;

    // Expect model to have been updated.
    expect(model.getProperty('title')).toEqual('Hello');
  });
});
