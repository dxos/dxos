//
// Copyright 2026 DXOS.org
//

import { initSubduction } from '@automerge/automerge-repo';
import { beforeAll, describe, test } from 'vitest';

import { Trigger, sleep } from '@dxos/async';

import { connectAdapters, createRepoTopology, documentIdToSedimentreeId } from './subduction-test-utils.ts';

const WITHIN_MS = 10_000;

type Doc = { value?: number };

describe('Subduction resync', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('a resync requested while a round is in flight runs another round after it', async ({ expect }) => {
    let link: 'on' | 'off' = 'on';
    // `edge` relays `writer`'s edits the way the sync server does: one forward per edit, never retried.
    const { repos, adapters, repoPairs } = await createRepoTopology({
      peers: ['reader', 'edge', 'writer'],
      connections: [
        ['reader', 'edge'],
        ['edge', 'writer'],
      ],
      options: { connectionStateProviderByConnection: { 0: () => link } },
    });
    const [reader, edge, writer] = repos;
    await connectAdapters(adapters, { repoPairs });
    await expect.poll(async () => (await reader.connectedSubductionPeerIds()).length, { timeout: WITHIN_MS }).toBe(1);
    await expect.poll(async () => (await writer.connectedSubductionPeerIds()).length, { timeout: WITHIN_MS }).toBe(1);

    const source = writer.create<Doc>();
    source.change((doc) => {
      doc.value = 0;
    });
    await expect.poll(() => writer.hasPendingSubductionSync(source.documentId), { timeout: WITHIN_MS }).toBe(false);
    const copy = await reader.find<Doc>(source.url);
    await expect.poll(() => copy.doc()?.value, { timeout: WITHIN_MS }).toBe(0);
    await expect.poll(() => reader.hasPendingSubductionSync(copy.documentId), { timeout: WITHIN_MS }).toBe(false);
    // Brings the reader's save baseline up to its heads, so no save of its own re-arms a round below.
    await reader.flush([copy.documentId]);

    // The next round's request to `edge` is answered while the reader is up to date, then held, so
    // the round is in flight across the edit below and settles with nothing new.
    const sedimentreeId = documentIdToSedimentreeId(copy.documentId);
    const readerSubduction = await reader.subduction;
    const syncWithPeer = readerSubduction.syncWithPeer.bind(readerSubduction);
    const answered = new Trigger();
    const release = new Trigger();
    let held = false;
    readerSubduction.syncWithPeer = async (peerId, id, subscribe, timeoutMs) => {
      if (held || id.toString() !== sedimentreeId.toString()) {
        return syncWithPeer(peerId, id, subscribe, timeoutMs);
      }
      held = true;
      const result = await syncWithPeer(peerId, id, subscribe, timeoutMs);
      answered.wake();
      await release.wait();
      return result;
    };
    reader.resyncSubduction(copy.documentId);
    await answered.wait({ timeout: WITHIN_MS });

    // The edit reaches `edge` while its forward to the reader is dropped, so only a round can bring it.
    const edgeSubduction = await edge.subduction;
    const storedOnEdge = (await edgeSubduction.getBlobs(sedimentreeId)).length;
    link = 'off';
    source.change((doc) => {
      doc.value = 1;
    });
    await expect
      .poll(async () => (await edgeSubduction.getBlobs(sedimentreeId)).length, { timeout: WITHIN_MS })
      .toBeGreaterThan(storedOnEdge);
    // Past the transport's delivery delay, so the forward has been sent into the dropped link.
    await sleep(100);
    link = 'on';
    expect(reader.hasPendingSubductionSync(copy.documentId)).toBe(true);

    // What the host does on seeing the reader's heads behind edge's.
    reader.resyncSubduction(copy.documentId);
    release.wake();

    await expect.poll(() => copy.doc()?.value, { timeout: WITHIN_MS }).toBe(1);
  });
});
