//
// Copyright 2020 DXOS.org
//

import { createKeyPair, createId } from '@dxos/crypto';

import { TestModel } from './test-model';
import { createTransform, latch } from '../util';
import { dxos } from '../proto/gen/testing';
import { ModelMessage } from '../models';

describe('test model', () => {
  test('basic mutations', () => {
    const itemId = createId();
    const model = new TestModel(itemId);

    // Model
    expect(model.itemId).toBe(itemId);
    expect(model.readOnly).toBeTruthy();

    // TestModel
    expect(model.keys).toHaveLength(0);

    // Set mutation
    const { publicKey: feedKey } = createKeyPair();

    model.processMessage({
      feedKey,
      seq: 1
    }, {
      set: {
        key: 'title',
        value: 'DXOS'
      }
    });
    expect(model.getProperty('title')).toBe('DXOS');
    expect(model.keys).toHaveLength(1);

    model.processMessage({
      feedKey,
      seq: 1
    }, {
      append: {
        key: 'title',
        value: '0.0.1'
      }
    });
    expect(model.getProperty('title')).toBe('DXOS:0.0.1');
    expect(model.keys).toHaveLength(1);
  });

  test('mutations feedback loop', async () => {
    const { publicKey: feedKey } = createKeyPair();
    const itemId = createId();

    // Create transform that connects model output to model input.
    let seq = 0;
    const transform = createTransform<dxos.echo.testing.ItemMutation, ModelMessage<dxos.echo.testing.ItemMutation>>(
      async (mutation: dxos.echo.testing.ItemMutation) => {
        const message: ModelMessage<dxos.echo.testing.ItemMutation> = {
          meta: {
            feedKey,
            seq
          },
          mutation
        };

        seq++;
        return message;
      });

    // Create a writable model.
    const model = new TestModel(itemId, transform);

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
