//
// Copyright 2024 DXOS.org
//

import { BaseBlockstore } from 'blockstore-core';
import { IDBBlockstore } from 'blockstore-idb';
import type { CID } from 'multiformats';

import { storeName } from './common';

export const create = () => {
  return new MixedBlockstore();
};

/**
 * A blockstore that communicates with the DXOS blob service,
 * and which uses an indexedDB blockstore as a client cache.
 */
class MixedBlockstore extends BaseBlockstore {
  readonly #apiHost: string;
  readonly #idbStore: IDBBlockstore;

  constructor() {
    super();

    this.#apiHost = 'http://localhost:8787';
    this.#idbStore = new IDBBlockstore(storeName());
  }

  async open() {
    await this.#idbStore.open();
  }

  url(cid?: CID) {
    const path = cid ? cid.toString() : '';
    return `${this.#apiHost}/api/file/${path}`;
  }

  // Blockstore implementation
  override async delete(key: CID): Promise<void> {
    await this.#idbStore.delete(key);
    await fetch(this.url(key), {
      method: 'DELETE',
    });
  }

  override async get(key: CID): Promise<Uint8Array> {
    if (await this.#idbStore.has(key)) {
      return await this.#idbStore.get(key);
    }

    return await fetch(this.url(key), {
      method: 'GET',
    })
      .then((r) => r.arrayBuffer())
      .then((r) => new Uint8Array(r));
  }

  override async has(key: CID): Promise<boolean> {
    if (await this.#idbStore.has(key)) {
      return true;
    }

    return await fetch(this.url(key), {
      method: 'HEAD',
    }).then((r) => r.ok);
  }

  override async put(key: CID, val: Uint8Array): Promise<CID> {
    await this.#idbStore.put(key, val);
    await fetch(this.url(key), {
      method: 'POST',
      body: val,
    });

    return key;
  }

  async destroy(): Promise<void> {
    await this.#idbStore.destroy();
  }
}
