//
// Copyright 2023 DXOS.org
//

import * as A from '@automerge/automerge';
import { type DocumentId, type Heads, generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { createIdFromSpaceKey } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey, SpaceId } from '@dxos/keys';
import { range } from '@dxos/util';

import { createTestSqliteRuntime } from '../testing';
import { TestReplicationNetwork } from '../testing';
import { AutomergeHost, type RootDocumentSpaceKeyProvider } from './automerge-host';
import { type EchoNetworkAdapter } from './echo-network-adapter';
import { deriveCollectionIdFromSpaceId } from './space-collection';

describe('AutomergeHost', () => {
  test('can create documents', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = await setupAutomergeHost(runtime);
    const handle = await host.createDoc<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    await host.flush(Context.default());
    expect(handle.doc()!.text).toEqual('Hello world');
  });

  test('resolves a document space from collection membership without a loaded handle', async ({ expect }) => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = await setupAutomergeHost(runtime);

    // Regression: a document known to the space via the root's document list, but whose handle was
    // never created (eviction / lazy load), must resolve to its space rather than reading as "not
    // in any space" — the latter produced spurious share-policy (`authorizeFetch`) denials.
    const spaceId = SpaceId.random();
    const { documentId: rootId } = parseAutomergeUrl(generateAutomergeUrl());
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    await host.updateLocalCollectionState(deriveCollectionIdFromSpaceId(spaceId, rootId), [documentId]);
    expect(await host.getContainingSpaceIdForDocument(documentId)).toEqual(spaceId);

    // A document in no registered collection (and with no loaded handle) stays unresolved.
    const { documentId: unknownId } = parseAutomergeUrl(generateAutomergeUrl());
    expect(await host.getContainingSpaceIdForDocument(unknownId)).toBeNull();

    // A non-space collection id must not throw out of the resolver and must not resolve.
    const { documentId: otherId } = parseAutomergeUrl(generateAutomergeUrl());
    await host.updateLocalCollectionState('test-collection', [otherId]);
    expect(await host.getContainingSpaceIdForDocument(otherId)).toBeNull();
  });

  test('resolves a document space from the embedded root-doc space key when not in any collection', async ({
    expect,
  }) => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());

    // Fallback path: a document in no local collection resolves its space via the loaded-handle /
    // root-doc space-key provider, then derives the space id via `createIdFromSpaceKey`.
    const spaceKey = PublicKey.random();
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const host = await setupAutomergeHost(runtime, (id) => (id === documentId ? spaceKey : undefined));

    expect(await host.getContainingSpaceIdForDocument(documentId)).toEqual(await createIdFromSpaceKey(spaceKey));

    // A document the provider does not recognize (and in no collection) stays unresolved.
    const { documentId: unknownId } = parseAutomergeUrl(generateAutomergeUrl());
    expect(await host.getContainingSpaceIdForDocument(unknownId)).toBeNull();
  });

  test('changes are preserved in storage', async () => {
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}.db`;
    const { runtime: runtime1, dispose: dispose1 } = createTestSqliteRuntime(tmpPath);
    const host = await setupAutomergeHost(runtime1);
    const handle = await host.createDoc<any>();
    handle.change((doc: any) => {
      doc.text = 'Hello world';
    });
    const url = handle.url;

    await host.flush(Context.default());
    await host.close();
    await dispose1();

    const { runtime: runtime2, dispose: dispose2 } = createTestSqliteRuntime(tmpPath);
    onTestFinished(() => dispose2());
    const host2 = await setupAutomergeHost(runtime2);
    const handle2 = await host2.loadDoc<any>(Context.default(), url);
    invariant(handle2);
    await handle2.whenReady();
    expect(handle2.doc()!.text).toEqual('Hello world');
    await host2.flush(Context.default());
  });

  test('load resolves when document is created from binary', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = await setupAutomergeHost(runtime);

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
    invariant(loadedHandle);
    expect(loadedHandle.doc()).toEqual(createdHandle.doc());
  });

  test('query single document heads', async () => {
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}.db`;

    const { runtime: runtime1, dispose: dispose1 } = createTestSqliteRuntime(tmpPath);
    const host = await setupAutomergeHost(runtime1);
    const handle = await host.createDoc({ text: 'Hello world' });
    const expectedHeads = A.getHeads(handle.doc()!);
    await host.flush(Context.default());

    expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);
    await host.close();
    await dispose1();

    // Simulate a restart.
    {
      const { runtime: runtime2, dispose: dispose2 } = createTestSqliteRuntime(tmpPath);
      onTestFinished(() => dispose2());
      const host = await setupAutomergeHost(runtime2);
      expect(await host.getHeads([handle.documentId])).toEqual([expectedHeads]);
    }
  });

  test('query multiple document heads', async () => {
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}.db`;

    const { runtime: runtime1, dispose: dispose1 } = createTestSqliteRuntime(tmpPath);
    const host = await setupAutomergeHost(runtime1);
    const handles = await Promise.all(range(2, () => host.createDoc({ text: 'Hello world' })));
    const expectedHeads: (Heads | undefined)[] = handles.map((handle) => A.getHeads(handle.doc()!));
    await host.flush(Context.default());

    const ids = handles.map((handle) => handle.documentId);
    ids.splice(1, 0, 'non-existent-id' as DocumentId);
    expectedHeads.splice(1, 0, undefined);

    expect(await host.getHeads(ids)).toEqual(expectedHeads);
    await host.close();
    await dispose1();

    // Simulate a restart.
    {
      const { runtime: runtime2, dispose: dispose2 } = createTestSqliteRuntime(tmpPath);
      onTestFinished(() => dispose2());
      const host = await setupAutomergeHost(runtime2);
      expect(await host.getHeads(ids)).toEqual(expectedHeads);
    }
  });

  test('loadDoc respects fetchFromNetwork', { timeout: 10_000 }, async () => {
    const { runtime: runtime1, dispose: dispose1 } = createTestSqliteRuntime();
    onTestFinished(() => dispose1());
    const host1 = await setupAutomergeHost(runtime1);

    const { runtime: runtime2, dispose: dispose2 } = createTestSqliteRuntime();
    onTestFinished(() => dispose2());
    const host2 = await setupAutomergeHost(runtime2);
    const handle = await host2.createDoc({ text: 'Hello world' });
    await host2.flush(Context.default());

    const network = await new TestReplicationNetwork().open();
    await host1.addReplicator(Context.default(), await network.createReplicator());
    await host2.addReplicator(Context.default(), await network.createReplicator());

    // (1) fetchFromNetwork=false on a doc not yet on disk: returns null immediately
    // without waiting on the network, even though host2 has it.
    expect(
      await host1.loadDoc(Context.default(), handle.documentId, { fetchFromNetwork: false, timeout: 1_000 }),
    ).toBeNull();

    // (2) fetchFromNetwork=true: host1 announces, host2 sends bytes, doc syncs.
    const loaded = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, {
      fetchFromNetwork: true,
      timeout: 5_000,
    });
    invariant(loaded);
    expect(loaded.doc()!.text).toEqual('Hello world');

    // (3) Now that host1 has the doc on disk, fetchFromNetwork=false succeeds.
    await host1.flush(Context.default());
    const localOnly = await host1.loadDoc<{ text: string }>(Context.default(), handle.documentId, {
      fetchFromNetwork: false,
    });
    invariant(localOnly);
    expect(localOnly.doc()!.text).toEqual('Hello world');

    await host1.close();
    await host2.close();
    await network.close();
  });

  test('loadDoc with fetchFromNetwork=false does not announce when doc is in storage', { timeout: 5_000 }, async () => {
    // Pre-populate host1's storage with the doc, then close so that the
    // host1 we test with has the doc on disk but did not author it (i.e.
    // it's not in `_createdDocuments` and won't auto-announce).
    const tmpPath = `/tmp/dxos-${PublicKey.random().toHex()}.db`;
    let documentId: DocumentId;
    {
      const { runtime, dispose } = createTestSqliteRuntime(tmpPath);
      const provider = await setupAutomergeHost(runtime);
      const handle = await provider.createDoc({ text: 'Hello world' });
      documentId = handle.documentId;
      await provider.flush(Context.default());
      await provider.close();
      await dispose();
    }

    const { runtime: runtime1, dispose: dispose1 } = createTestSqliteRuntime(tmpPath);
    onTestFinished(() => dispose1());
    const host1 = await setupAutomergeHost(runtime1);

    const { runtime: runtime2, dispose: dispose2 } = createTestSqliteRuntime();
    onTestFinished(() => dispose2());
    const host2 = await setupAutomergeHost(runtime2);

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
    invariant(loaded);
    expect(loaded.doc()!.text).toEqual('Hello world');

    // Give any in-flight share-policy debounce a chance to fire.
    await sleep(100);

    expect(requests).not.toContain(documentId);

    await host1.close();
    await host2.close();
    await network.close();
  });

  test('collection synchronization', { timeout: 30_000 }, async () => {
    const NUM_DOCUMENTS = 10;

    const { runtime: runtime1, dispose: dispose1 } = createTestSqliteRuntime();
    onTestFinished(() => dispose1());
    const host1 = await setupAutomergeHost(runtime1);

    const { runtime: runtime2, dispose: dispose2 } = createTestSqliteRuntime();
    onTestFinished(() => dispose2());
    const host2 = await setupAutomergeHost(runtime2);
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
});

type RuntimeArg = ReturnType<typeof createTestSqliteRuntime>['runtime'];

const setupAutomergeHost = async (runtime: RuntimeArg, getSpaceKeyByRootDocumentId?: RootDocumentSpaceKeyProvider) => {
  const host = new AutomergeHost({ runtime, getSpaceKeyByRootDocumentId });
  await host.open();
  onTestFinished(async () => {
    if (host.isOpen) {
      await host.close();
    }
  });
  return host;
};
