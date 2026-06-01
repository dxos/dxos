//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PublicKey } from '@dxos/keys';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { MetadataStore } from './metadata-store';

describe('MetadataStore', () => {
  describe('deleted spaces', () => {
    test('addDeletedSpace records a tombstone', async () => {
      const store = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
      const spaceKey = PublicKey.random();

      expect(store.deletedSpaces).to.have.length(0);

      await store.addDeletedSpace(spaceKey);
      expect(store.deletedSpaces).to.have.length(1);
      expect(store.deletedSpaces[0].equals(spaceKey)).to.be.true;
    });

    test('addDeletedSpace is idempotent', async () => {
      const store = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
      const spaceKey = PublicKey.random();

      await store.addDeletedSpace(spaceKey);
      await store.addDeletedSpace(spaceKey);
      expect(store.deletedSpaces).to.have.length(1);
    });

    test('tombstones survive reload', async () => {
      const directory = createStorage({ type: StorageType.RAM }).createDirectory();
      const spaceKey = PublicKey.random();

      const store = new MetadataStore(directory);
      await store.load();
      await store.addDeletedSpace(spaceKey);
      await store.close();

      const reloaded = new MetadataStore(directory);
      await reloaded.load();
      expect(reloaded.deletedSpaces).to.have.length(1);
      expect(reloaded.deletedSpaces[0].equals(spaceKey)).to.be.true;
    });
  });
});
