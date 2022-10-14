//
// Copyright 2022 DXOS.org
//

import { Keyring } from '@dxos/keyring';
import { createStorage, Directory, StorageType } from '@dxos/random-access-storage';

import { FeedFactory } from './feed-factory';
import { FeedStore } from './feed-store';

// TODO(burdon): Apply test pattern elsewhere.
//  - Each package has an exported testing.ts builder (which is composable across packages).
//  - Can have multiple convenience methods (rather than many uncoordinated functions).
//  - Avoids returning horrible bags of objects with horrible bags of properties.

export type TestBuilderOptions = {
  directory?: Directory
  keyring?: Keyring
}

export class TestBuilder {
  constructor (
    private readonly _properties: TestBuilderOptions = {}
  ) {}

  clone (): TestBuilder {
    return new TestBuilder(Object.assign({}, this._properties));
  }

  get directory (): Directory {
    return this._properties.directory ?? (this._properties.directory = createStorage({ type: StorageType.RAM }).createDirectory('/root'));
  }

  get keyring (): Keyring {
    return this._properties.keyring ?? (this._properties.keyring = new Keyring());
  }

  setDirectory (directory: Directory) {
    this._properties.directory = directory;
    return this;
  }

  setDirectoryByType (type: StorageType, path = '/tmp/dxos/testing/feed-store') {
    return this.setDirectory(createStorage({ type }).createDirectory(path));
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
