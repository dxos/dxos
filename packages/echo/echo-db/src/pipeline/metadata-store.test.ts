//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

import { MetadataStore } from './metadata-store';

describe('MetadataStore in-memory', () => {
  it('Creates party and adds feeds to it', async () => {
    const storage = createStorage('', StorageType.RAM);
    const store = new MetadataStore(storage.directory('metadata'));
    await store.load();
    expect(store.parties?.length).toBe(0);

    const partyKey = PublicKey.random();
    await store.addParty(partyKey);
    expect(store.parties?.length).toBe(1);
    expect(store.parties?.[0].key).toEqual(partyKey);
    expect(store.parties?.[0].feedKeys?.length ?? 0).toBe(0);

    const feedKey1 = PublicKey.random();
    await store.addPartyFeed(partyKey, feedKey1);
    expect(store.parties?.[0].feedKeys?.length).toBe(1);
    expect(store.parties?.[0].feedKeys?.[0]).toEqual(feedKey1);

    const feedKey2 = PublicKey.random();
    await store.addPartyFeed(partyKey, feedKey2);
    expect(store.parties?.[0].feedKeys?.length).toBe(2);
    expect(store.parties?.[0].feedKeys?.[1]).toEqual(feedKey2);
  });

  it('Creates party when adding feed', async () => {
    const storage = createStorage('', StorageType.RAM);
    const store = new MetadataStore(storage.directory('metadata'));
    await store.load();

    const partyKey = PublicKey.random();
    const feedKey = PublicKey.random();
    await store.addPartyFeed(partyKey, feedKey);
    expect(store.parties?.[0].key).toEqual(partyKey);
    expect(store.parties?.[0].feedKeys?.length).toBe(1);
    expect(store.parties?.[0].feedKeys?.[0]).toEqual(feedKey);
  });

  it('Doesn\'t add same feed twice', async () => {
    const storage = createStorage('', StorageType.RAM);
    const store = new MetadataStore(storage.directory('metadata'));
    await store.load();

    const partyKey = PublicKey.random();
    const feedKey = PublicKey.random();

    await store.addPartyFeed(partyKey, feedKey);
    await store.addPartyFeed(partyKey, feedKey);

    expect(store.parties?.[0].feedKeys?.length).toBe(1);
    expect(store.parties?.[0].feedKeys?.[0]).toEqual(feedKey);
  });

  // TODO(yivlad): Doesn't work for now.
  it.skip('Resets storage', async () => {
    const storage = createStorage('snapshots', StorageType.RAM);
    const store = new MetadataStore(storage.directory(''));

    const partyKey = PublicKey.random();
    const feedKey = PublicKey.random();
    await store.addPartyFeed(partyKey, feedKey);
    expect(store.parties?.[0].key).toEqual(partyKey);
    expect(store.parties?.[0].feedKeys?.length).toBe(1);
    expect(store.parties?.[0].feedKeys?.[0]).toEqual(feedKey);

    await store.clear();
    expect(store.parties?.length).toEqual(0);
  });

  it('not corrupted', async () => {
    const storage = createStorage('', StorageType.RAM);
    const dir = storage.directory('metadata');
    const metadataStore = new MetadataStore(dir);

    // writing something in metadataStore to save.
    await metadataStore.setDataFeed(PublicKey.random(), PublicKey.random());
    await metadataStore.setDataFeed(PublicKey.random(), PublicKey.random());
    await metadataStore.setDataFeed(PublicKey.random(), PublicKey.random());

    // using same directory to test if truncates.
    const metadataStore2 = new MetadataStore(dir);
    // should owerride previous data.
    await metadataStore2.setDataFeed(PublicKey.random(), PublicKey.random());
    await metadataStore2.load();
  });
});
