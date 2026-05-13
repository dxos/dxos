//
// Copyright 2023 DXOS.org
//

import * as A from '@automerge/automerge';
import { type DocumentId, type Heads, generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import type { LevelDB } from '@dxos/kv-store';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { range } from '@dxos/util';

import { TestReplicationNetwork } from '../testing';
import { AutomergeHost } from './automerge-host';
import { type EchoNetworkAdapter } from './echo-network-adapter';

describe('AutomergeHost', () => {
  test('can create documents', async () => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handle = await host.createDoc<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    await host.flush(Context.default());
    expect(handle.doc()!.text).toEqual('Hello world');
  });

  test('changes are preserved in storage', async () => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });
    const handle = await host.createDoc<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    await host.flush(Context.default());
    await host.close();

    const host2 = await setupAutomergeHost({ level });
    const handle2 = await host2.loadDoc<any>(Context.default(), url);
    await handle2.whenReady();
    expect(handle2.doc()!.text).toEqual('Hello world');
    await host2.flush(Context.default());
  });

  test('load resolves when document is created from binary', async () => {
    const level = await createLevel();
    const host = await setupAutomergeHost({ level });

    // Create a document to get its binary representation
    const document = A.from({ text: 'Hello world' });
    const binary = A.save(document);
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());

    // Start loading a non-existent document (should hang until created)
    const loadPromise = host.loadDoc(Context.default(), documentId);

    // Create the document from binary - this should resolve the load
    const createdHandle = await host.createDoc(binary, { preserveHistory: true, documentId });

    // The load should now resolve
    const loadedHandle = await loadPromise;
    expect(loadedHandle.doc()).toEqual(createdHandle.doc());
  });

  test('query single document heads', async () => {
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}`;

    const level = await createLevel(tmpPath);
    const host = await setupAutomergeHost({ level });
    const handle = await host.createDoc({ text: 'Hello world' });
    const expectedHeads = A.getHeads(handle.doc()!);
    await host.flush(Context.default());

    expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);
    await host.close();
    await level.close();

    // Simulate a restart.
    {
      const host = await setupAutomergeHost({ level: await createLevel(tmpPath) });
      expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);
    }
  });

  test('query multiple document heads', async () => {
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}`;

    const level = await createLevel(tmpPath);
    const host = await setupAutomergeHost({ level });
    const handles = await Promise.all(range(2, () => host.createDoc({ text: 'Hello world' })));
    const expectedHeads: (Heads | undefined)[] = handles.map((handle) => A.getHeads(handle.doc()!));
    await host.flush(Context.default());

    const ids = handles.map((handle) => handle.documentId);
    ids.splice(1, 0, 'non-existent-id' as DocumentId);
    expectedHeads.splice(1, 0, undefined);

    expect(await host.getHeads(ids)).toEqual(expectedHeads);
    await host.close();
    await level.close();

    // Simulate a restart.
    {
      const level = await createLevel(tmpPath);
      const host = await setupAutomergeHost({ level });
      expect(await host.getHeads(ids)).toEqual(expectedHeads);
      await host.close();
      await level.close();
    }
  });

  test('loadDoc respects fetchFromNetwork', { timeout: 10_000 }, async () => {
    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = await createLevel();
    const host2 = await setupAutomergeHost({ level: level2 });
    const handle = await host2.createDoc({ text: 'Hello world' });
    await host2.flush(Context.default());

    const network = await new TestReplicationNetwork().open();
    await host1.addReplicator(Context.default(), await network.createReplicator());
    await host2.addReplicator(Context.default(), await network.createReplicator());

    // (1) fetchFromNetwork=false on a doc not yet on disk: throws unavailable
    // without waiting on the network, even though host2 has it.
    await expect(
      host1.loadDoc(Context.default(), handle.documentId, { fetchFromNetwork: false, timeout: 1_000 }),
    ).rejects.toThrow(/unavailable/i);

    // (2) fetchFromNetwork=true: host1 announces, host2 sends bytes, doc syncs.
    const loaded = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, {
      fetchFromNetwork: true,
      timeout: 5_000,
    });
    expect(loaded.doc()!.text).toEqual('Hello world');

    // (3) Now that host1 has the doc on disk, fetchFromNetwork=false succeeds.
    await host1.flush(Context.default());
    const localOnly = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, {
      fetchFromNetwork: false,
    });
    expect(localOnly.doc()!.text).toEqual('Hello world');

    await host1.close();
    await host2.close();
    await network.close();
  });

  test(
    'loadDoc with fetchFromNetwork=false does not announce when doc is in storage',
    { timeout: 5_000 },
    async () => {
      // Pre-populate host1's storage with the doc, then close so that the
      // host1 we test with has the doc on disk but did not author it (i.e.
      // it's not in `_createdDocuments` and won't auto-announce).
      const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}`;
      let documentId: DocumentId;
      {
        const level = await createLevel(tmpPath);
        const provider = await setupAutomergeHost({ level });
        const handle = await provider.createDoc({ text: 'Hello world' });
        documentId = handle.documentId;
        await provider.flush(Context.default());
        await provider.close();
        await level.close();
      }

      const level1 = await createLevel(tmpPath);
      const host1 = await setupAutomergeHost({ level: level1 });

      const level2 = await createLevel();
      const host2 = await setupAutomergeHost({ level: level2 });

      const network = await new TestReplicationNetwork().open();
      await host1.addReplicator(Context.default(), await network.createReplicator());
      await host2.addReplicator(Context.default(), await network.createReplicator());

      // Spy on host2's incoming-request event — fires when any peer sends
      // an automerge `request` message for a doc to host2. If host1 ever
      // announced wanting `documentId`, this would trigger.
      const requests: DocumentId[] = [];
      const adapter = (host2 as unknown as { _echoNetworkAdapter: EchoNetworkAdapter })._echoNetworkAdapter;
      adapter.documentRequested.on(({ documentId: requestedId }) => {
        requests.push(requestedId);
      });

      // Load the doc that's already on disk; should resolve from storage.
      const loaded = await host1.loadDoc<{ text: string }>(Context.default(), documentId, {
        fetchFromNetwork: false,
      });
      expect(loaded.doc()!.text).toEqual('Hello world');

      // Give any in-flight share-policy debounce a chance to fire.
      await sleep(100);

      expect(requests).not.toContain(documentId);

      await host1.close();
      await host2.close();
      await network.close();
    },
  );

  test('collection synchronization', { timeout: 30_000 }, async () => {
    const NUM_DOCUMENTS = 10;

    const level1 = await createLevel();
    const host1 = await setupAutomergeHost({ level: level1 });

    const level2 = await createLevel();
    const host2 = await setupAutomergeHost({ level: level2 });
    const documentIds: DocumentId[] = [];
    for (const i of range(NUM_DOCUMENTS)) {
      const handle = await host2.createDoc({ docIndex: i });
      documentIds.push(handle.documentId);
    }
    await host2.flush(Context.default());

    const network = await new TestReplicationNetwork().open();
    await host1.addReplicator(Context.default(), await network.createReplicator());
    await host2.addReplicator(Context.default(), await network.createReplicator());

    const collectionId = 'test-collection';
    await host1.updateLocalCollectionState(collectionId, documentIds);
    await host2.updateLocalCollectionState(collectionId, documentIds);

    for (const documentId of documentIds) {
      await expect
        .poll(() => host1.getHeads([documentId]), { timeout: 20_000 })
        .toEqual(await host2.getHeads([documentId]));
    }

    await host1.close();
    await host2.close();
    await network.close();
  });

  const createLevel = async (tmpPath?: string) => {
    const level = createTestLevel(tmpPath);
    await openAndClose(level);
    return level;
  };
});

const setupAutomergeHost = async ({ level }: { level: LevelDB }) => {
  const host = new AutomergeHost({
    db: level,
  });
  await host.open();
  onTestFinished(async () => {
    await host.close();
  });
  return host;
};
