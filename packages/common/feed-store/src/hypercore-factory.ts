//
// Copyright 2022 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import defaultsDeep from 'lodash.defaultsdeep';

import { type Signer, subtleCrypto } from '@dxos/crypto';
import { failUndefined } from '@dxos/debug';
import type { HypercoreOptions } from '@dxos/hypercore';
import { createCrypto, hypercore } from '@dxos/hypercore';
import { KeyringApiService } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Directory } from '@dxos/random-access-storage';

import { HypercoreWrapper } from './hypercore-wrapper.ts';

export type HypercoreFactoryOptions = {
  root: Directory;
  signer?: Signer;
  hypercore?: HypercoreOptions;
};

export type HypercoreCreateOptions = HypercoreOptions & {
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
 * Effect service tag for {@link HypercoreFactory}.
 */
export class HypercoreFactoryService extends EffectContext.Service<HypercoreFactoryService, HypercoreFactory<any>>()(
  '@dxos/feed-store/HypercoreFactory',
) {}

/**
 * Root directory for hypercore feed files.
 */
export class HypercoreStorageDirectoryService extends EffectContext.Service<
  HypercoreStorageDirectoryService,
  Directory
>()('@dxos/feed-store/HypercoreStorageDirectory') {}

/**
 * Hypercore factory.
 */
export class HypercoreFactory<T extends {}> {
  private readonly _root: Directory;
  private readonly _signer?: Signer;
  private readonly _hypercoreOptions?: HypercoreOptions;

  constructor({ root, signer, hypercore }: HypercoreFactoryOptions) {
    log('HypercoreFactory', { options: hypercore });
    this._root = root ?? failUndefined();
    this._signer = signer;
    this._hypercoreOptions = hypercore;
  }

  get storageRoot() {
    return this._root;
  }

  async createHypercore(publicKey: PublicKey, options?: HypercoreCreateOptions): Promise<HypercoreWrapper<T>> {
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
    return new HypercoreWrapper(core, publicKey, storageDir);
  }
}

export type HypercoreFactoryLayerOptions = Pick<HypercoreFactoryOptions, 'hypercore'>;

/**
 * Effect Layer constructing a {@link HypercoreFactory} from feed storage and keyring services.
 */
export const HypercoreFactoryLayer = (
  options: HypercoreFactoryLayerOptions = {},
): Layer.Layer<HypercoreFactoryService, never, KeyringApiService | HypercoreStorageDirectoryService> =>
  Layer.effect(
    HypercoreFactoryService,
    Effect.gen(function* () {
      const root = yield* HypercoreStorageDirectoryService;
      const signer = yield* KeyringApiService;
      return new HypercoreFactory({
        root,
        signer,
        hypercore: options.hypercore,
      });
    }),
  );
