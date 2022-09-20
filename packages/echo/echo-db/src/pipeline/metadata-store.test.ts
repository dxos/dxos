//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/keys';
import { createStorage, StorageType } from '@dxos/random-access-storage';

import { MetadataStore } from './metadata-store';

describe('MetadataStore in-memory', () => {
  it('creates party', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const store = new MetadataStore(storage.createDirectory('metadata'));
    await store.load();
    expect(store.parties?.length).toBe(0);

    const partyKey = PublicKey.random();
    const feedKey = PublicKey.random();
    await store.addParty(partyKey);
    await store.setGenesisFeed(partyKey, feedKey);
    expect(store.parties?.length).toBe(1);
    expect(store.parties?.[0].record.spaceKey).toEqual(partyKey);
    expect(store.parties?.[0].record.genesisFeedKey).toEqual(feedKey);
  });

  // TODO(yivlad): Doesn't work for now.
  it.skip('Resets storage', async () => {
    const storage = createStorage({ type: StorageType.RAM, root: 'snapshots' });
    const store = new MetadataStore(storage.createDirectory(''));

    const partyKey = PublicKey.random();
    const feedKey = PublicKey.random();
    await store.addParty(partyKey);
    await store.setGenesisFeed(partyKey, feedKey);
    expect(store.parties?.length).toBe(1);
    expect(store.parties?.[0].record.spaceKey).toEqual(partyKey);
    expect(store.parties?.[0].record.genesisFeedKey).toEqual(feedKey);

    await store.clear();
    expect(store.parties?.length).toEqual(0);
  });

  it('not corrupted', async () => {
    const storage = createStorage({ type: StorageType.RAM });
    const dir = storage.createDirectory('metadata');
    const metadataStore = new MetadataStore(dir);

    // writing something in metadataStore to save.
    {
      const partyKey = PublicKey.random();
      await metadataStore.addParty(partyKey);
      await metadataStore.setDataFeed(partyKey, PublicKey.random());
    }
    {
      const partyKey = PublicKey.random();
      await metadataStore.addParty(partyKey);
      await metadataStore.setDataFeed(partyKey, PublicKey.random());
    }
    {
      const partyKey = PublicKey.random();
      await metadataStore.addParty(partyKey);
      await metadataStore.setDataFeed(partyKey, PublicKey.random());
    }

    // using same directory to test if truncates.
    const metadataStore2 = new MetadataStore(dir);
    // should owerride previous data.
    {
      const partyKey = PublicKey.random();
      await metadataStore.addParty(partyKey);
      await metadataStore.setDataFeed(partyKey, PublicKey.random());
    }
    await metadataStore2.load();
  });
});
