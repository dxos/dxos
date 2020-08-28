//
// Copyright 2020 DXOS.org
//

import { createKeyPair, createId } from '@dxos/crypto';
import { dxos } from '@dxos/experimental-echo-protocol';
import { createTransform, latch } from '@dxos/experimental-util';

import { ModelMessage } from '../types';
import { TestModel } from './test-model';

describe('test model', () => {
  test('basic mutations', () => {
    const itemId = createId();
    const model = new TestModel(TestModel.meta, itemId);

    // Model
    expect(model.itemId).toBe(itemId);
    expect(model.readOnly).toBeTruthy();

    // TestModel
    expect(model.keys).toHaveLength(0);

    // Set mutation
    const { publicKey: feedKey } = createKeyPair();

    model.processMessage({ feedKey, seq: 1 }, { key: 'title', value: 'DXOS' });
    expect(model.getProperty('title')).toBe('DXOS');
    expect(model.keys).toHaveLength(1);
  });

  test('mutations feedback loop', async () => {
    const { publicKey: feedKey } = createKeyPair();
    const itemId = createId();

    // Create transform that connects model output to model input.
    let seq = 0;
    const transform = createTransform<
      dxos.echo.testing.TestItemMutation, ModelMessage<dxos.echo.testing.TestItemMutation>
      >(
        async (mutation: dxos.echo.testing.TestItemMutation) => {
          const message: ModelMessage<dxos.echo.testing.TestItemMutation> = {
            meta: {
              feedKey,
              seq
            },
            mutation
          };

          seq++;
          return message;
        });

    // Create a writeStream model.
    const model = new TestModel(TestModel.meta, itemId, transform);

    // Connect output to input processor.
    transform.pipe(model.processor);

    const [counter, updateCounter] = latch();
    const unsubscribe = model.subscribe(model => {
      expect((model as TestModel).getProperty('title')).toBe('DXOS');
      updateCounter();
    });

    await model.setProperty('title', 'DXOS');

    await counter;
    unsubscribe();
  });
});
