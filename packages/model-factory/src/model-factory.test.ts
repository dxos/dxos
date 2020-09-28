//
// Copyright 2020 DXOS.org
//

import { createId, createKeyPair } from '@dxos/crypto';
import { protocol } from '@dxos/echo-protocol';
import { createAny, createTransform, latch } from '@dxos/util';

import { ModelFactory } from './model-factory';
import { TestModel } from './testing';
import { ModelMessage } from './types';

describe('model factory', () => {
  test('model constructor', async () => {
    const itemId = createId();

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel.meta, TestModel);
    const model = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId);
    expect(model).toBeTruthy();
  });

  test('model mutation processing', async () => {
    const { publicKey: feedKey } = createKeyPair();
    const itemId = createId();

    const objects: protocol.dxos.echo.testing.ITestItemMutation[] = [];

    // Transform outbound mutations to inbounds model messsges (create loop).
    const writeStream = createTransform<
      protocol.dxos.echo.testing.ITestItemMutation, ModelMessage<protocol.dxos.echo.testing.ITestItemMutation>
      >(
        async (mutation: protocol.dxos.echo.testing.ITestItemMutation) => {
          objects.push(mutation);
          const out: ModelMessage<protocol.dxos.echo.testing.ITestItemMutation> = {
            meta: {
              feedKey,
              seq: 1
            },
            mutation
          };

          return out;
        }
      );

    // Create model.
    const modelFactory = new ModelFactory().registerModel(TestModel.meta, TestModel);
    const model = modelFactory.createModel<TestModel>(TestModel.meta.type, itemId, writeStream);
    expect(model).toBeTruthy();

    // Update model.
    await model.setProperty('title', 'Hello');
    expect(objects).toHaveLength(1);
    expect(objects[0]).toEqual(createAny<protocol.dxos.echo.testing.ITestItemMutation>({
      key: 'title',
      value: 'Hello'
    }, 'dxos.echo.testing.TestItemMutation'));

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
