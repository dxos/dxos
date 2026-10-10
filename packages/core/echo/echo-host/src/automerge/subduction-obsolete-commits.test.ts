//
// Copyright 2026 DXOS.org
//

import * as Automerge from '@automerge/automerge';
import { type AutomergeUrl, generateAutomergeUrl, initSubduction, parseAutomergeUrl } from '@automerge/automerge-repo';
import { CommitId, Subduction } from '@automerge/automerge-subduction';
import { beforeAll, describe, test, vi } from 'vitest';

import { invariant } from '@dxos/invariant';

import {
  SYNC_WINDOW_MS,
  createRepo,
  shutdownRepo,
  createSqliteAdapter,
  documentIdToSedimentreeId,
  waitForQueryState,
} from './subduction-test-utils.ts';

type Doc = { text: string };

type Planted = {
  url: AutomergeUrl;
  storage: Awaited<ReturnType<typeof createSqliteAdapter>>;
  doc: Automerge.Doc<Doc>;
  fragments: number;
};

/** History long enough to form at least one fragment; formation is hash-thresholded, so it tops up a bounded number of times. */
const buildHistory = (): Automerge.Doc<Doc> => {
  let doc = Automerge.change(Automerge.init<Doc>('02'.repeat(16)), { time: 0 }, (draft) => {
    draft.text = '';
  });
  for (
    let round = 0;
    round < 6 && (round === 0 || Automerge.getFragmentMetadata(doc, { start: 1 }).length === 0);
    round++
  ) {
    for (let index = 0; index < 600; index++) {
      doc = Automerge.change(doc, { time: 0 }, (draft) => {
        draft.text = 'y'.repeat(64) + round + ':' + index;
      });
    }
  }
  return doc;
};

/**
 * Writes a document's history into fresh storage through a throwaway repo's engine, as the storage a client ends up with
 * after receiving loose commits one at a time and later a fragment over them. With `fragmentHeadsLoose` false the
 * fragment heads arrive only inside their fragments, which Subduction cannot absorb the covered commits into.
 */
const plantHistory = async ({ fragmentHeadsLoose }: { fragmentHeadsLoose: boolean }): Promise<Planted> => {
  const doc = buildHistory();
  const fragmentMetas = Automerge.getFragmentMetadata(doc, { start: 1 });
  invariant(fragmentMetas.length > 0, 'fixture must form at least one fragment');
  const fragmentHeads = new Set(fragmentMetas.map(({ head }) => head));

  const url = generateAutomergeUrl();
  const sedimentreeId = documentIdToSedimentreeId(parseAutomergeUrl(url).documentId);
  const storage = await createSqliteAdapter();
  const writerRepo = createRepo({ storage, network: [] }, { registerCleanup: false });
  const writer = await writerRepo.subduction;
  for (const change of Automerge.getAllChanges(doc)) {
    const { hash, deps } = Automerge.decodeChange(change);
    if (fragmentHeadsLoose || !fragmentHeads.has(hash)) {
      await writer.storeCommit(
        sedimentreeId,
        CommitId.fromHexString(hash),
        deps.map((dep) => CommitId.fromHexString(dep)),
        change,
      );
    }
  }
  const bundles = Automerge.bundleFragmentMetadata(doc, fragmentMetas);
  for (const [index, { head, boundary, checkpoints }] of fragmentMetas.entries()) {
    await writer.storeFragment(
      sedimentreeId,
      CommitId.fromHexString(head),
      boundary.map((id) => CommitId.fromHexString(id)),
      checkpoints.map((id) => CommitId.fromHexString(id)),
      bundles[index],
    );
  }
  await shutdownRepo(writerRepo);
  return { url, storage, doc, fragments: fragmentMetas.length };
};

const storedCount = async (storage: Planted['storage'], kind: 'commits' | 'fragments', url: AutomergeUrl) => {
  const sedimentreeId = documentIdToSedimentreeId(parseAutomergeUrl(url).documentId);
  return (await storage.loadRange(['subduction', kind, sedimentreeId.toString()])).length;
};

/** Opens the planted document and waits for compaction to leave only the live loose commits on disk. */
const openAndCompact = async (expect: Parameters<Parameters<typeof test>[1]>[0]['expect'], planted: Planted) => {
  const reader = createRepo({ storage: planted.storage, network: [] });
  await waitForQueryState(reader.findWithProgress<Doc>(planted.url), ['ready'], { timeout: SYNC_WINDOW_MS });
  const handle = await reader.find<Doc>(planted.url);
  expect([...Automerge.getHeads(handle.doc())].sort()).toEqual([...Automerge.getHeads(planted.doc)].sort());
  const live = Automerge.getFragmentMetadata(planted.doc, 0).length;
  await expect.poll(() => storedCount(planted.storage, 'commits', planted.url), { timeout: SYNC_WINDOW_MS }).toBe(live);
};

describe('Subduction compaction of commits a fragment holds', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('evicts the tree when the engine still holds the compacted commits, and keeps its records', async ({
    expect,
  }) => {
    const planted = await plantHistory({ fragmentHeadsLoose: false });
    const removed = vi.spyOn(Subduction.prototype, 'removeSedimentree');
    try {
      await openAndCompact(expect, planted);
      await expect.poll(() => removed.mock.calls.length, { timeout: SYNC_WINDOW_MS }).toBe(1);
      expect(removed.mock.calls[0][0].toString()).toBe(
        documentIdToSedimentreeId(parseAutomergeUrl(planted.url).documentId).toString(),
      );
      expect(await storedCount(planted.storage, 'fragments', planted.url)).toBe(planted.fragments);
      expect(await storedCount(planted.storage, 'commits', planted.url)).toBe(
        Automerge.getFragmentMetadata(planted.doc, 0).length,
      );
    } finally {
      removed.mockRestore();
    }
  });

  test('leaves the tree alone when the engine absorbed the commits itself', async ({ expect }) => {
    const planted = await plantHistory({ fragmentHeadsLoose: true });
    const removed = vi.spyOn(Subduction.prototype, 'removeSedimentree');
    try {
      await openAndCompact(expect, planted);
      expect(removed).not.toHaveBeenCalled();
    } finally {
      removed.mockRestore();
    }
  });
});
