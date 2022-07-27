//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';

import { MetadataStore } from './metadata-store';

describe('MetadataStore', () => {
  it('save/load', async () => {
    const storage = createStorage('', StorageType.IDB);
    const directory = storage.directory('metadata');
    const partyKey = PublicKey.random();

    // Create a new metadata store. And adding party.
    {
      const metadataStore = new MetadataStore(directory);
      await metadataStore.addParty(partyKey);
    }

    // Create a new metadata store in same directory. And check if loads party.
    {
      const metadataStore = new MetadataStore(directory);
      await metadataStore.load();
      const partyLoaded = metadataStore.getParty(partyKey);
      expect(partyLoaded?.key).toEqual(partyKey);
    }
  });
});
