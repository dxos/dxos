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
  root: Directory;
  signer?: Signer;
  hypercore?: HypercoreOptions;
};

export type FeedOptions = HypercoreOptions & {
  writable?: boolean;
};

/**
 * Hypercore factory.
 */
export class FeedFactory<T extends {}> {
  private readonly _storage: (
    publicKey: PublicKey
  ) => RandomAccessStorageConstructor;

  private readonly _root: Directory;
  private readonly _signer?: Signer;
  private readonly _hypercoreOptions?: HypercoreOptions;

  // TODO(burdon): Must patch codec here createCodecEncoding.

  constructor({ root, signer, hypercore }: FeedFactoryOptions) {
    this._root = root ?? failUndefined();
    this._signer = signer;
    this._hypercoreOptions = hypercore;

    this._storage = (publicKey: PublicKey) => (filename) => {
      const dir = this._root.createDirectory(publicKey.toHex());
      const { type, native } = dir.getOrCreateFile(filename);
      log('created', {
        path: `${type}:${this._root.path}/${publicKey.truncate()}/${filename}`
      });
      return native;
    };
  }

  createFeed(publicKey: PublicKey, options?: FeedOptions): Hypercore<T> {
    if (options?.writable && !this._signer) {
      throw new Error('Signer required to create writable feeds.');
    }
    if (options?.secretKey) {
      console.warn('Secret key ignored due to signer.');
    }

    // Required due to hypercore's 32-byte key limit.
    // TODO(burdon): Add details.
    const key = sha256(publicKey.toHex());

    const opts = Object.assign(
      {},
      this._hypercoreOptions,
      {
        // TODO(burdon): Test if can omit (given crypto signer) in v10.
        secretKey:
          this._signer && options?.writable ? Buffer.from('secret') : undefined,
        crypto: this._signer ? createCrypto(this._signer, publicKey) : undefined
      },
      options
    );

    return hypercore(this._storage(publicKey), key, opts);
  }
}
