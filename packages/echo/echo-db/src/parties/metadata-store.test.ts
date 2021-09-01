//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/crypto';

import { createRamStorage } from '../util';
import { MetadataStore } from './metadata-store';

describe('MetadataStore', () => {
  it('in-memory', async () => {
    const store = new MetadataStore(createRamStorage());

    const empty = await store.load();
    expect(empty.parties?.length).toBe(0);

    const publicKey = PublicKey.random();
    await store.save({ parties: [{ key: publicKey }] });
    const updated = await store.load();
    expect(updated.parties?.length).toBe(1);
    expect(updated.parties?.[0].key).toEqual(publicKey);

    // TODO(yivlad): clearing storage doesn't work
    // await store.clear();
    // const cleared = await store.load();
    // expect(cleared.parties?.length).toBe(0);
  });
});
