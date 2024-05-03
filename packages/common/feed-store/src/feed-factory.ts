//
// Copyright 2022 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import { type Signer, subtleCrypto } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import type { HypercoreOptions } from '@dxos/hypercore';
import { createCrypto, hypercore } from '@dxos/hypercore';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Directory } from '@dxos/random-access-storage';

import { FeedWrapper } from './feed-wrapper';

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
   * NOTE: The callback must be invoked to complete the write operation.
   * @param peer Always null in hypercore@9.12.0.
   */
  onwrite?: (index: number, data: any, peer: null, cb: (err: Error | null) => void) => void;
};

/**
 * Hypercore factory.
 */
export class FeedFactory<T extends {}> {
  private readonly _root: Directory;
  private readonly _signer?: Signer;
  private readonly _hypercoreOptions?: HypercoreOptions;

  constructor({ root, signer, hypercore }: FeedFactoryOptions) {
    log('FeedFactory', { options: hypercore });
    this._root = root ?? failUndefined();
    this._signer = signer;
    this._hypercoreOptions = hypercore;
  }

  get storageRoot() {
    return this._root;
  }

  async createFeed(publicKey: PublicKey, options?: FeedOptions): Promise<FeedWrapper<T>> {
    if (options?.writable && !this._signer) {
      throw new Error('Signer required to create writable feeds.');
    }
    if (options?.secretKey) {
      log.warn('Secret key ignored due to signer.');
    }

    // Required due to hypercore's 32-byte key limit.
    const key = await subtleCrypto.digest('SHA-256', Buffer.from(publicKey.toHex()));

    const opts = defaultsDeep(
      {
        // sparse: false,
        // stats: false,
      },
      this._hypercoreOptions,
      {
        secretKey: this._signer && options?.writable ? Buffer.from('secret') : undefined,
        crypto: this._signer ? createCrypto(this._signer, publicKey) : undefined,
        onwrite: options?.onwrite,
        noiseKeyPair: {}, // We're not using noise.
      },
      options,
    );

    const storageDir = this._root.createDirectory(publicKey.toHex());
    const makeStorage = (filename: string) => {
      const { type, native } = storageDir.getOrCreateFile(filename);
      log('created', {
        path: `${type}:${this._root.path}/${publicKey.truncate()}/${filename}`,
      });

      return native;
    };

    const core = hypercore(makeStorage, Buffer.from(key), opts);
    return new FeedWrapper(core, publicKey, storageDir);
  }
}
