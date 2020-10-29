//
// Copyright 2020 DXOS.org
//

import { createId, randomBytes } from '@dxos/crypto';
import { PartySnapshot } from '@dxos/echo-protocol';

import { createRamStorage } from './persistant-ram-storage';
import { SnapshotStore } from './snapshot-store';

test('in-memory', async () => {
  const store = new SnapshotStore(createRamStorage());

  const key1 = randomBytes();
  const key2 = randomBytes();

  expect(await store.load(key1)).toBeUndefined();
  expect(await store.load(key2)).toBeUndefined();

  const snapshot: PartySnapshot = {
    partyKey: key1,
    database: {
      items: [{
        itemId: createId(),
        itemType: 'foo'
      }]
    }
  };

  await store.save(snapshot);

  expect(await store.load(key1)).toEqual(snapshot);
  expect(await store.load(key2)).toBeUndefined();
});
