//
// Copyright 2020 DXOS.org
//

import { createModelTestBench } from '@dxos/echo-db';

import { TextModel } from './text-model';

describe('TextModel', () => {
  test.skip('insert', async () => {
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

  test.skip('snapshot', async () => {
    const { peers, items: [item1, item2] } = await createModelTestBench({ model: TextModel });

    item1.model.insert(0, 'Hello World!');

    const snapshot = item2.modelMeta.snapshotCodec!.encode(item1.model.createSnapshot());
    await item2.model.restoreFromSnapshot(item2.modelMeta.snapshotCodec!.decode(snapshot));
    expect(item2.model.textContent).toBe('Hello World!');

    for await (const peer of peers) {
      await peer.close();
    }
  });
});
