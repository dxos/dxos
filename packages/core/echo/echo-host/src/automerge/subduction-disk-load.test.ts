//
// Copyright 2026 DXOS.org
//

import { type AutomergeUrl, initSubduction } from '@automerge/automerge-repo';
import { beforeAll, describe, test } from 'vitest';

import {
  connectAdapters,
  createRepo,
  createRepoTopology,
  createSqliteAdapter,
  waitForQueryState,
  waitForSubductionSave,
} from './subduction-test-utils.ts';

// Long enough that a load held to a round's deadline cannot pass the assertions below.
const ROUND_DEADLINE_MS = 30_000;
const WITHIN_MS = 5_000;

type Doc = { value?: number };

/**
 * Storage holding a document's Subduction records and nothing else. A device ends up like this for a document
 * whose data arrived while it was not loaded, e.g. through a heal retry of an evicted document: Subduction
 * stores the data, and no handle is there to write an Automerge snapshot.
 */
const storeSubductionRecordsOnly = async (): Promise<{
  url: AutomergeUrl;
  storage: Awaited<ReturnType<typeof createSqliteAdapter>>;
}> => {
  const writerStorage = await createSqliteAdapter();
  const writer = createRepo({ storage: writerStorage, network: [] });
  const handle = writer.create<Doc>();
  handle.change((doc) => {
    doc.value = 42;
  });
  await waitForSubductionSave([writer]);

  const storage = await createSqliteAdapter();
  for (const { key, data } of await writerStorage.loadRange(['subduction'])) {
    if (data) {
      await storage.save(key, data);
    }
  }
  return { url: handle.url, storage };
};

describe('Subduction document stored on disk', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('loads from storage with no peer connected', async ({ expect }) => {
    const { url, storage } = await storeSubductionRecordsOnly();
    const reader = createRepo({ storage, network: [], subductionTimeouts: { syncMs: ROUND_DEADLINE_MS } });

    const progress = reader.findWithProgress<Doc>(url);
    await waitForQueryState(progress, ['ready'], { timeout: WITHIN_MS });
    expect((await reader.find<Doc>(url)).doc()?.value).toBe(42);
  });

  test('loads from storage while the connected peer never answers', async ({ expect }) => {
    const { url, storage } = await storeSubductionRecordsOnly();
    let link: 'on' | 'off' = 'on';
    const { repos, adapters, repoPairs } = await createRepoTopology({
      peers: ['reader', 'peer'],
      connections: [['reader', 'peer']],
      options: {
        storages: [storage],
        connectionStateProviderByConnection: { 0: () => link },
        subductionTimeouts: { syncMs: ROUND_DEADLINE_MS },
      },
    });
    const [reader] = repos;
    await connectAdapters(adapters, { repoPairs });
    await expect.poll(async () => (await reader.connectedSubductionPeerIds()).length, { timeout: WITHIN_MS }).toBe(1);
    link = 'off';

    const progress = reader.findWithProgress<Doc>(url);
    await waitForQueryState(progress, ['ready'], { timeout: WITHIN_MS });
    expect((await reader.find<Doc>(url)).doc()?.value).toBe(42);
  });
});
