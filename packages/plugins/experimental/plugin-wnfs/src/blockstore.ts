//
// Copyright 2024 DXOS.org
//

import { BaseBlockstore } from 'blockstore-core';
import { IDBBlockstore } from 'blockstore-idb';
import type { CID } from 'multiformats';

import { storeName } from './common';

export const create = (apiHost?: string) => {
  return new MixedBlockstore(apiHost);
};

/**
 * A blockstore that communicates with the DXOS blob service,
 * and which uses an indexedDB blockstore as a client cache.
 */
export class MixedBlockstore extends BaseBlockstore {
  readonly #apiHost: string | undefined;
  readonly #idbStore: IDBBlockstore;

  constructor(apiHost?: string) {
    super();

    this.#apiHost = apiHost;
    this.#idbStore = new IDBBlockstore(storeName());
  }

  async open() {
    await this.#idbStore.open();
  }

  url(apiHost: string, cid?: CID) {
    const path = cid ? cid.toString() : '';
    return `${apiHost}/api/file/${path}`;
  }

  // Blockstore implementation
  override async delete(key: CID): Promise<void> {
    await this.#idbStore.delete(key);

    if (this.#apiHost) {
      await fetch(this.url(this.#apiHost, key), {
        method: 'DELETE',
      });
    }
  }

  override async get(key: CID): Promise<Uint8Array> {
    if (await this.#idbStore.has(key)) {
      return await this.#idbStore.get(key);
    }

    if (this.#apiHost) {
      return await fetch(this.url(this.#apiHost, key), {
        method: 'GET',
      })
        .then((r) => r.arrayBuffer())
        .then((r) => new Uint8Array(r));
    }

    return await this.#idbStore.get(key);
  }

  override async has(key: CID): Promise<boolean> {
    if (await this.#idbStore.has(key)) {
      return true;
    }

    if (this.#apiHost) {
      return await fetch(this.url(this.#apiHost, key), {
        method: 'HEAD',
      }).then((r) => r.ok);
    }

    return false;
  }

  override async put(key: CID, val: Uint8Array): Promise<CID> {
    await this.#idbStore.put(key, val);

    if (this.#apiHost) {
      await fetch(this.url(this.#apiHost, key), {
        method: 'POST',
        body: val,
      });
    }

    return key;
  }

  async destroy(): Promise<void> {
    await this.#idbStore.destroy();
  }
}
