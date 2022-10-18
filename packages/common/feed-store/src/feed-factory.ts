//
// Copyright 2022 DXOS.org
//

import hypercore from 'hypercore';
import type { Hypercore, HypercoreOptions } from 'hypercore';
import { RandomAccessStorageConstructor } from 'random-access-storage';

import { sha256, Signer } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import { createCrypto } from '@dxos/hypercore';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { Directory } from '@dxos/random-access-storage';

export type FeedFactoryOptions = {
  root: Directory
  signer?: Signer
  hypercore?: HypercoreOptions
}

export type FeedOptions = HypercoreOptions & {
  writable?: boolean
}

/**
 * Hypercore factory.
 */
export class FeedFactory<T = {}> {
  private readonly _storage: (publicKey: PublicKey) => RandomAccessStorageConstructor;

  private readonly _root: Directory;
  private readonly _signer: Signer;
  private readonly _hypercoreOptions?: HypercoreOptions;

  constructor ({
    root,
    signer,
    hypercore
  }: FeedFactoryOptions) {
    this._root = root ?? failUndefined();
    this._signer = signer ?? failUndefined();
    this._hypercoreOptions = hypercore;

    this._storage = (publicKey: PublicKey) => (filename) => {
      const dir = this._root.createDirectory(publicKey.toHex());
      const { type, native } = dir.getOrCreateFile(filename);
      log(`File[${type}]: ${dir.path}/${filename}`);
      return native;
    };
  }

  createFeed (publicKey: PublicKey, options?: FeedOptions): Hypercore<T> {
    if (options?.secretKey) {
      console.warn('Secret key ignored due to signer.');
    }

    // TODO(burdon): Current hack due to key-length restriction (move to @dxos/hypercore).
    const key = sha256(publicKey.toHex());

    return hypercore(this._storage(publicKey), key, Object.assign({}, this._hypercoreOptions, {
      // TODO(burdon): Test if can omit (given crypto signer) in v10.
      secretKey: (this._signer && options?.writable) ? Buffer.from('dummy') : undefined,
      crypto: createCrypto(this._signer, publicKey)
    }, options));
  }
}
