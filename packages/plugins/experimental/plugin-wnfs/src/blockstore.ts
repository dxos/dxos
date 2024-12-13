//
// Copyright 2024 DXOS.org
//

import { CarBufferWriter } from '@ipld/car';
import { BaseBlockstore } from 'blockstore-core';
import { IDBBlockstore } from 'blockstore-idb';
import debounce from 'debounce';
import * as IDB from 'idb-keyval';
import { CID } from 'multiformats';

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
  readonly #localStore: IDBBlockstore;

  #isConnected: boolean;
  #flushQueue: () => void;
  #queue: string[];

  constructor(apiHost?: string) {
    super();

    this.#apiHost = apiHost ? apiHost.replace(/\/?$/, '') : undefined;
    this.#localStore = new IDBBlockstore(storeName());
    this.#isConnected = navigator.onLine;
    this.#queue = [];

    this.#flushQueue = debounce(this.#flushQueueInt, 10000);
  }

  async open() {
    await this.#localStore.open();
    await this.#restoreQueue();

    window.addEventListener('offline', async () => {
      this.#isConnected = false;
    });

    window.addEventListener('online', async () => {
      this.#isConnected = true;
      this.#flushQueue();
    });
  }

  url(apiHost: string, cid?: CID) {
    const path = cid ? cid.toString() : '';
    return `${apiHost}/api/file/${path}`;
  }

  // BLOCKSTORE IMPLEMENTATION

  override async delete(key: CID): Promise<void> {
    await this.#localStore.delete(key);

    if (this.#isConnected && this.#apiHost) {
      await fetch(this.url(this.#apiHost, key), {
        method: 'DELETE',
      });
    }
  }

  override async get(key: CID): Promise<Uint8Array> {
    if (await this.#localStore.has(key)) {
      return await this.#localStore.get(key);
    }

    if (this.#isConnected && this.#apiHost) {
      const block = await fetch(this.url(this.#apiHost, key), {
        method: 'GET',
      })
        .then((r) => r.arrayBuffer())
        .then((r) => new Uint8Array(r));

      // Make sure it is cached locally
      await this.#localStore.put(key, block);

      return block;
    }

    return await this.#localStore.get(key);
  }

  override async has(key: CID): Promise<boolean> {
    if (await this.#localStore.has(key)) {
      return true;
    }

    if (this.#isConnected && this.#apiHost) {
      return await fetch(this.url(this.#apiHost, key), {
        method: 'HEAD',
      }).then((r) => r.ok);
    }

    return false;
  }

  override async put(key: CID, val: Uint8Array): Promise<CID> {
    await this.#localStore.put(key, val);

    await this.#addToQueue(key);
    this.#flushQueue();

    return key;
  }

  async destroy(): Promise<void> {
    await this.#localStore.destroy();
  }

  // REMOTE

  async putRemote(key: CID, val: Uint8Array) {
    if (this.#apiHost) {
      await fetch(this.url(this.#apiHost, key), {
        method: 'POST',
        body: val,
      });
    }
  }

  async putCarRemote(car: Uint8Array) {
    if (this.#apiHost) {
      await fetch(this.url(this.#apiHost), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.ipld.car',
        },
        body: car,
      });
    }
  }

  // QUEUE

  readonly queueCacheName = `${storeName()}/state/queue`;

  async #addToQueue(key: CID) {
    await this.#saveQueue([...this.#queue, key.toString()]);
  }

  async #flushQueueInt() {
    if (!this.#isConnected || !this.#apiHost) {
      return;
    }

    const keys = [...this.#queue];

    // Create CAR file
    const blocks = await Promise.all(
      keys.map(async (key) => {
        const cid = CID.parse(key);
        const bytes = await this.#localStore.get(cid);
        return { cid, bytes };
      }),
    );

    const totalBytes = blocks.reduce((sum, block) => sum + block.bytes.length, 0);
    const writer = CarBufferWriter.createWriter(new ArrayBuffer(totalBytes));

    blocks.forEach((block) => {
      writer.write(block);
    });

    const carBytes = writer.close();
    await this.putCarRemote(carBytes);

    // Adjust queue
    const queue = [...this.#queue].filter((k) => {
      if (keys.includes(k)) return false;
      return true;
    });

    await this.#saveQueue(queue);
  }

  async #restoreQueue() {
    const fromCache = await IDB.get(this.queueCacheName);
    if (fromCache && Array.isArray(fromCache)) {
      this.#queue = fromCache;
      this.#flushQueue();
    }
  }

  async #saveQueue(items: string[]) {
    const arr = [...items];
    this.#queue = arr;
    await IDB.set(this.queueCacheName, arr);
  }
}
