//
// Copyright 2022 DXOS.org
//

import { RandomAccessStorageConstructor } from 'random-access-storage';

import { Signer, subtleCrypto } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import type { Hypercore, HypercoreOptions } from '@dxos/hypercore';
import { createCrypto, hypercore } from '@dxos/hypercore';
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
  /**
   * Optional hook called before data is written after being verified.
   * Called for writes done by this peer as well as for data replicated from other peers.
   * NOTE: Remember to call the callback.
   * @param peer Always null in hypercore@9.12.0.
   */
  onwrite?: (index: number, data: any, peer: null, cb: (err: Error | null) => void) => void;
};

/**
 * Hypercore factory.
 */
export class FeedFactory<T extends {}> {
  private readonly _storage: (publicKey: PublicKey) => RandomAccessStorageConstructor;

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
        path: `${type}:${this._root.path}/${publicKey.truncate()}/${filename}`,
      });

      return native;
    };
  }

  async createFeed(publicKey: PublicKey, options?: FeedOptions): Promise<Hypercore<T>> {
    if (options?.writable && !this._signer) {
      throw new Error('Signer required to create writable feeds.');
    }
    if (options?.secretKey) {
      console.warn('Secret key ignored due to signer.');
    }

    // Required due to hypercore's 32-byte key limit.
    const key = await subtleCrypto.digest('SHA-256', Buffer.from(publicKey.toHex()));

    const opts = Object.assign(
      {},
      this._hypercoreOptions,
      {
        secretKey: this._signer && options?.writable ? Buffer.from('secret') : undefined,
        crypto: this._signer ? createCrypto(this._signer, publicKey) : undefined,
        onwrite: options?.onwrite,
        noiseKeyPair: {}, // We're not using noise.
      },
      options,
    );

    return hypercore(this._storage(publicKey), Buffer.from(key), opts);
  }
}
