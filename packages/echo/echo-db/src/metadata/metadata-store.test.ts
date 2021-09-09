//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/crypto';

import { createRamStorage } from '../util';
import { MetadataStore } from './metadata-store';

describe('MetadataStore in-memory', () => {
  it('Creates party and adds feeds to it', async () => {
    const store = new MetadataStore(createRamStorage());

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
    const store = new MetadataStore(createRamStorage());

    await store.load();

    const partyKey = PublicKey.random();
    const feedKey = PublicKey.random();
    await store.addPartyFeed(partyKey, feedKey);
    expect(store.parties?.[0].key).toEqual(partyKey);
    expect(store.parties?.[0].feedKeys?.length).toBe(1);
    expect(store.parties?.[0].feedKeys?.[0]).toEqual(feedKey);
  });

  it('Doesn\'t add same feed twice', async () => {
    const store = new MetadataStore(createRamStorage());

    await store.load();

    const partyKey = PublicKey.random();
    const feedKey = PublicKey.random();

    await store.addPartyFeed(partyKey, feedKey);
    await store.addPartyFeed(partyKey, feedKey);

    expect(store.parties?.[0].feedKeys?.length).toBe(1);
    expect(store.parties?.[0].feedKeys?.[0]).toEqual(feedKey);
  });
});
