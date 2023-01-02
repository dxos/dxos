import { PublicKey } from "@dxos/keys";
import { SpaceSnapshot } from "@dxos/protocols/proto/dxos/echo/snapshot";
import { createStorage } from "@dxos/random-access-storage";
import { Timeframe } from "@dxos/timeframe";
import expect from 'expect';
import { SnapshotStore } from "./snapshot-store";

describe('SnapshotStore', () => {
  it('should save and load snapshot', async () => {
    const store = new SnapshotStore(createStorage().createDirectory('snapshots'));

    const snapshot: SpaceSnapshot = {
      spaceKey: PublicKey.random().asBuffer(),
      timeframe: new Timeframe(),
      database: {
        items: [],
        links: [],
      }
    };

    const key = await store.saveSnapshot(snapshot);
    const loaded = await store.loadSnapshot(key);
    expect(loaded).toEqual(snapshot);
  })
});