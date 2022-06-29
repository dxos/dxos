//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { createId, createKeyPair, PublicKey } from '@dxos/crypto';
import { PartySnapshot } from '@dxos/echo-protocol';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

import { SnapshotStore } from './snapshot-store';

const createPublicKey = () => PublicKey.from(createKeyPair().publicKey);

describe('SnapshotStore', () => {
  test('in-memory', async () => {
    const store = new SnapshotStore(createStorage('snapshots', StorageType.RAM));

    const key1 = createPublicKey();
    const key2 = createPublicKey();

    expect(await store.load(key1)).toBeUndefined();
    expect(await store.load(key2)).toBeUndefined();

    const snapshot: PartySnapshot = {
      partyKey: key1.asBuffer(),
      database: {
        items: [{
          itemId: createId(),
          itemType: 'example:test'
        }],
        links: []
      }
    };

    await store.save(snapshot);

    expect(await store.load(key1)).toEqual(snapshot);
    expect(await store.load(key2)).toBeUndefined();
  });
});
