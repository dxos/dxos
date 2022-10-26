//
// Copyright 2022 DXOS.org
//

import type { ValueEncoding } from 'hypercore';

import { Codec } from '@dxos/codec-protobuf';
import { createCodecEncoding } from '@dxos/hypercore';
import { Keyring } from '@dxos/keyring';
import { createStorage, Directory, Storage, StorageType } from '@dxos/random-access-storage';

import { FeedFactory } from '../feed-factory';
import { FeedStore } from '../feed-store';
import { defaultCodec, defaultTestGenerator, defaultValueEncoding, TestGenerator, TestItem } from './test-generator';

export type TestBuilderOptions<T extends {}> = {
  codec?: Codec<T>;
  storage?: Storage;
  directory?: Directory;
  keyring?: Keyring;
  valueEncoding?: ValueEncoding<T>;
  generator?: TestGenerator<T>;
};

/**
 * The builder provides building blocks for tests with sensible defaults.
 * - Factory methods trigger the automatic generation of unset required properties.
 * - Avoids explosion of overly specific test functions that require and return large bags of properties.
 */
// TODO(burdon): Apply this pattern elsewhere.
export class TestBuilder<T extends {}> {
  static readonly ROOT_DIR = '/tmp/dxos/testing/feed-store';

  constructor(protected readonly _properties: TestBuilderOptions<T> = {}) {}

  clone(): TestBuilder<T> {
    return new TestBuilder<T>(Object.assign({}, this._properties));
  }

  get storage(): Storage {
    return (this._properties.storage ??= createStorage({
      type: StorageType.RAM
    }));
  }

  get directory(): Directory {
    return (this._properties.directory ??= this.storage.createDirectory(TestBuilder.ROOT_DIR));
  }

  get keyring(): Keyring {
    return (this._properties.keyring ??= new Keyring());
  }

  setStorage(type: StorageType, root = TestBuilder.ROOT_DIR) {
    this._properties.storage = createStorage({ type, root });
    this._properties.directory = this.storage.createDirectory('feeds');
    return this;
  }

  setKeyring(keyring: Keyring) {
    this._properties.keyring = keyring;
    return this;
  }

  createFeedFactory() {
    const codec = this._properties.codec;
    const valueEncoding =
      this._properties.valueEncoding ?? codec !== undefined ? createCodecEncoding(codec!) : undefined;

    return new FeedFactory<T>({
      root: this.directory,
      signer: this.keyring,
      hypercore: {
        valueEncoding
      }
    });
  }

  createFeedStore() {
    return new FeedStore<T>({
      factory: this.createFeedFactory()
    });
  }
}

/**
 * Builder with default encoder and generator.
 */
export class TestItemBuilder extends TestBuilder<TestItem> {
  constructor() {
    super({
      codec: defaultCodec,
      valueEncoding: defaultValueEncoding,
      generator: defaultTestGenerator
    });
  }

  get codec() {
    return this._properties.codec!;
  }

  get valueEncoding() {
    return this._properties.valueEncoding!;
  }

  get generator() {
    return this._properties.generator!;
  }
}
