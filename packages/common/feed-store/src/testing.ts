//
// Copyright 2022 DXOS.org
//

import { Keyring } from '@dxos/keyring';
import { createStorage, Directory, Storage, StorageType } from '@dxos/random-access-storage';

import { FeedFactory } from './feed-factory';
import { FeedStore } from './feed-store';

// TODO(burdon): Apply test pattern elsewhere.
//  - Each package has an exported testing.ts builder (which is composable across packages).
//  - Can have multiple convenience methods (rather than many uncoordinated functions).
//  - Avoids returning horrible bags of objects with horrible bags of properties.

export type TestBuilderOptions = {
  storage?: Storage
  directory?: Directory
  keyring?: Keyring
}

export class TestBuilder {
  static readonly ROOT_DIR = '/tmp/dxos/testing/feed-store';

  constructor (
    private readonly _properties: TestBuilderOptions = {}
  ) {}

  clone (): TestBuilder {
    return new TestBuilder(Object.assign({}, this._properties));
  }

  get storage (): Storage {
    return this._properties.storage ?? (this._properties.storage = createStorage({ type: StorageType.RAM }));
  }

  get directory (): Directory {
    return this._properties.directory ?? (this._properties.directory = this.storage.createDirectory(TestBuilder.ROOT_DIR));
  }

  get keyring (): Keyring {
    return this._properties.keyring ?? (this._properties.keyring = new Keyring());
  }

  setStorage (type: StorageType, root = TestBuilder.ROOT_DIR) {
    this._properties.storage = createStorage({ type, root });
    this._properties.directory = this.storage.createDirectory('feeds');
    return this;
  }

  setKeyring (keyring: Keyring) {
    this._properties.keyring = keyring;
    return this;
  }

  createFeedFactory () {
    return new FeedFactory({
      root: this.directory,
      signer: this.keyring
    });
  }

  createFeedStore () {
    return new FeedStore({
      factory: this.createFeedFactory()
    });
  }
}
