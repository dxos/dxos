//
// Copyright 2023 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/keys';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { createStorage } from '@dxos/random-access-storage';
import { describe, test } from 'vitest'
import { Timeframe } from '@dxos/timeframe';

import { SnapshotStore } from './snapshot-store';

describe('SnapshotStore', () => {
  test('should save and load snapshot', async () => {
    const store = new SnapshotStore(createStorage().createDirectory('snapshots'));

    const snapshot: SpaceSnapshot = {
      spaceKey: PublicKey.random().asBuffer(),
      timeframe: new Timeframe(),
      database: {
        items: [],
      },
    };

    const key = await store.saveSnapshot(snapshot);
    const loaded = await store.loadSnapshot(key);
    expect(loaded).toEqual(snapshot);
  }).tag('flaky');
});
