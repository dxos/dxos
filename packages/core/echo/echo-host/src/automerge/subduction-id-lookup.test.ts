//
// Copyright 2026 DXOS.org
//

import {
  type AutomergeUrl,
  type Chunk,
  type Repo,
  type StorageAdapterInterface,
  type StorageKey,
  initSubduction,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { beforeAll, describe, test } from 'vitest';

import { connectAdapters, createRepoTopology, waitForSubductionSave } from './subduction-test-utils.ts';

const WITHIN_MS = 10_000;

type Doc = { value?: number };

/** Joined storage key; `\0` occurs in no automerge-repo or Subduction key part. */
const toKey = (key: StorageKey): string => key.join('\0');

/**
 * In-memory storage that counts listings of the whole sedimentree id range (`[prefix, 'ids']`), the
 * O(stored documents) scan behind the bridge's `loadAllSedimentreeIds`.
 */
class IdListingStorage implements StorageAdapterInterface {
  readonly #data = new Map<string, Uint8Array>();
  idListings = 0;

  async load(key: StorageKey): Promise<Uint8Array | undefined> {
    return this.#data.get(toKey(key));
  }

  async save(key: StorageKey, data: Uint8Array): Promise<void> {
    this.#data.set(toKey(key), data);
  }

  async saveBatch(entries: Array<[StorageKey, Uint8Array]>): Promise<void> {
    for (const [key, data] of entries) {
      this.#data.set(toKey(key), data);
    }
  }

  async remove(key: StorageKey): Promise<void> {
    this.#data.delete(toKey(key));
  }

  async loadRange(prefix: StorageKey): Promise<Chunk[]> {
    if (prefix.length === 2 && prefix[1] === 'ids') {
      this.idListings++;
    }
    const start = toKey(prefix);
    return [...this.#data]
      .filter(([key]) => key.startsWith(start))
      .map(([key, data]) => ({ key: key.split('\0'), data }));
  }

  async removeRange(prefix: StorageKey): Promise<void> {
    const start = toKey(prefix);
    for (const key of [...this.#data.keys()]) {
      if (key.startsWith(start)) {
        this.#data.delete(key);
      }
    }
  }
}

/** Stores documents on `holder` without keeping them loaded, so a peer gets them only by asking. */
const storeOnly = async (holder: Repo, count: number): Promise<AutomergeUrl[]> => {
  const urls: AutomergeUrl[] = [];
  for (let value = 0; value < count; value++) {
    const handle = holder.create<Doc>();
    handle.change((doc) => {
      doc.value = value;
    });
    urls.push(handle.url);
  }
  await waitForSubductionSave([holder]);
  for (const url of urls) {
    await holder.removeFromCache(parseAutomergeUrl(url).documentId);
  }
  return urls;
};

describe('Subduction sedimentree id lookup', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  // Subduction checks whether a sedimentree is stored on its hydration hot path. Without the
  // storage's `containsSedimentreeId` it lists every stored id instead, once per sync round of a
  // document not stored yet, so a fresh device pulling N documents did O(N²) storage work.
  test('pulling documents a node never stored does not list every stored id', async ({ expect }) => {
    const readerStorage = new IdListingStorage();
    const { repos, adapters, repoPairs } = await createRepoTopology({
      peers: ['reader', 'holder'],
      connections: [['reader', 'holder']],
      options: { storages: [readerStorage] },
    });
    const [reader, holder] = repos;
    // The reader already stores documents of its own, as a device does for its other spaces.
    for (let value = 0; value < 20; value++) {
      const handle = reader.create<Doc>();
      handle.change((doc) => {
        doc.value = value;
      });
    }
    await waitForSubductionSave([reader]);
    const urls = await storeOnly(holder, 20);
    await connectAdapters(adapters, { repoPairs });
    readerStorage.idListings = 0;

    const handles = await Promise.all(urls.map((url) => reader.find<Doc>(url)));
    await expect
      .poll(() => handles.filter((handle) => handle.doc()?.value !== undefined).length, { timeout: WITHIN_MS })
      .toBe(urls.length);
    expect(readerStorage.idListings).toBe(0);
  });
});
