//
// Copyright 2020 DXOS.org
//

import { createModelTestBench } from '@dxos/echo-db';

import { TextModel } from './text-model';

describe('TextModel', () => {
  test('insert', async () => {
    const [peer1, peer2] = await createModelTestBench({ model: TextModel });

    peer1.model.insert(0, 'INSERTED TEXT');

    await peer2.model.modelUpdate.waitForCount(1);
    expect(peer2.model.textContent).toBe('INSERTED TEXT');

    peer2.model.insert(8, ' FOO');

    await peer1.model.modelUpdate.waitForCount(1);
    expect(peer1.model.textContent).toBe('INSERTED FOO TEXT');
  });

  test('snapshot', async () => {
    const [peer1, peer2] = await createModelTestBench({ model: TextModel });

    peer1.model.insert(0, 'INSERTED TEXT');

    const snapshot = peer1.modelMeta.snapshotCodec!.encode(peer1.model.createSnapshot());

    peer2.model.restoreFromSnapshot(peer2.modelMeta.snapshotCodec!.decode(snapshot));

    expect(peer2.model.textContent).toBe('INSERTED TEXT');
  });
});
