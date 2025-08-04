//
// Copyright 2022 DXOS.org
//

import type { ValueEncoding } from 'hypercore';

import { Keyring } from '@dxos/keyring';
import { type Directory, type Storage, StorageType, createStorage } from '@dxos/random-access-storage';

import { FeedFactory } from '../feed-factory';
import { FeedStore } from '../feed-store';

import { type TestGenerator, type TestItem, defaultTestGenerator, defaultValueEncoding } from './test-generator';

export type TestBuilderOptions<T extends {}> = {
  storage?: Storage;
  root?: Directory;
  keyring?: Keyring;
  valueEncoding?: ValueEncoding<T>;
  generator?: TestGenerator<T>;
};

type PropertyProvider<T extends {}, P> = (cb: TestBuilder<T>) => P;

const evaluate = <T extends {}, P>(builder: TestBuilder<T>, arg: P | PropertyProvider<T, P>) =>
  arg === 'function' ? (arg as Function)(builder) : arg;

/**
 * The builder provides building blocks for tests with sensible defaults.
 * - Factory methods trigger the automatic generation of unset required properties.
 * - Avoids explosion of overly specific test functions that require and return large bags of properties.
 */
export class TestBuilder<T extends {}> {
  static readonly ROOT_DIR = 'feeds';

  constructor(public readonly _properties: TestBuilderOptions<T> = {}) {}

  /**
   * Creates a new builder with the current builder's properties.
   */
  clone(): TestBuilder<T> {
    return new TestBuilder<T>(Object.assign({}, this._properties));
  }

  get keyring(): Keyring {
    return (this._properties.keyring ??= new Keyring());
  }

  get storage(): Storage {
    return (this._properties.storage ??= createStorage({ type: StorageType.RAM }));
  }

  get root(): Directory {
    return (this._properties.root ??= this.storage.createDirectory(TestBuilder.ROOT_DIR));
  }

  setKeyring(keyring: Keyring | PropertyProvider<T, Keyring>): this {
    this._properties.keyring = evaluate(this, keyring);
    return this;
  }

  setStorage(storage: Storage, root?: string): this {
    this._properties.storage = evaluate(this, storage);
    if (root) {
      this._properties.root = this.storage.createDirectory(root);
    }

    return this;
  }

  setRoot(root: Directory): this {
    this._properties.root = evaluate(this, root);
    return this;
  }

  createFeedFactory(): FeedFactory<T> {
    return new FeedFactory<T>({
      root: this.root,
      signer: this.keyring,
      hypercore: {
        valueEncoding: this._properties.valueEncoding,
      },
    });
  }

  createFeedStore(): FeedStore<T> {
    return new FeedStore<T>({
      factory: this.createFeedFactory(),
    });
  }
}

/**
 * Builder with default encoder and generator.
 */
export class TestItemBuilder extends TestBuilder<TestItem> {
  constructor() {
    super({
      valueEncoding: defaultValueEncoding,
      generator: defaultTestGenerator,
    });
  }

  get valueEncoding() {
    return this._properties.valueEncoding!;
  }

  get generator() {
    return this._properties.generator!;
  }
}
