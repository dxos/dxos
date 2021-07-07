//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createModelTestBench } from '@dxos/echo-db';

import { TextModel } from './text-model';

describe('TextModel', () => {
  test('insert', async () => {
    const { peers, items: [item1, item2] } = await createModelTestBench({ model: TextModel });

    item1.model.insert(0, 'Hello World!');

    await item2.model.modelUpdate.waitForCount(1);
    expect(item2.model.textContent).toBe('Hello World!');

    // TODO(burdon): Test delete.
    const words = item1.model.textContent.split(' ');
    item2.model.insert(words[0].length, ' DXOS');
    await item1.model.modelUpdate.waitForCount(1);
    expect(item1.model.textContent).toBe('Hello DXOS World!');

    // TODO(burdon): Errors. Race condition?
    console.log(peers);
    // for await (const peer of peers) {
    //   await peer.close();
    // }
  });

  test('snapshot', async () => {
    const { peers, items: [item1, item2] } = await createModelTestBench({ model: TextModel });

    item1.model.insert(0, 'Hello World!');

    const snapshot = item2.modelMeta.snapshotCodec!.encode(item1.model.createSnapshot());
    await item2.model.restoreFromSnapshot(item2.modelMeta.snapshotCodec!.decode(snapshot));
    expect(item2.model.textContent).toBe('Hello World!');

    for await (const peer of peers) {
      await peer.close();
    }
  });

  // This is a race condition and sometimes passes and sometimes not.
  test.skip('conflict', async () => {
    const { items: [item1, item2] } = await createModelTestBench({ model: TextModel });
    item1.model.modelUpdate.on(() => console.log(`m1 ${item1.model.textContent}`));
    item2.model.modelUpdate.on(() => console.log(`m2 ${item1.model.textContent}`));

    item1.model.insert(0, 'Hello');
    await item2.model.modelUpdate.waitForCount(1);
    item1.model.insert(5, ' world');
    item2.model.insert(5, '!');

    await item1.model.modelUpdate.waitForCount(1);
    expect(item1.model.textContent).toBe('Hello world!');
  });
});
