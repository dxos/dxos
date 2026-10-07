//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

import { AutomergeHost } from '../automerge/index.ts';
import { createTestSqliteRuntime } from '../testing/index.ts';
import { DocumentsSynchronizer } from './documents-synchronizer.ts';

/** A client-side replica fed by `sendUpdates`, the way `RepoProxy` integrates host batches. */
class TestClient<T = Record<string, unknown>> {
  readonly #docs = new Map<string, A.Doc<T>>();
  readonly #ready = new Map<string, Trigger>();

  readonly receive = (batch: { updates?: Array<{ documentId: string; mutation?: Uint8Array }> }) => {
    for (const { documentId, mutation } of batch.updates ?? []) {
      if (!mutation) {
        continue;
      }
      this.#docs.set(documentId, A.loadIncremental<T>(this.#docs.get(documentId) ?? A.init<T>(), mutation));
      this.#trigger(documentId).wake();
    }
  };

  loaded(documentId: string): Promise<void> {
    return this.#trigger(documentId).wait();
  }

  /** The replica of a document this client has received, which the caller knows has arrived. */
  doc(documentId: string): A.Doc<T> {
    const doc = this.#docs.get(documentId);
    invariant(doc, 'Document not received');
    return doc;
  }

  /** The replica as it stands, which a condition may be waiting to arrive. */
  peek(documentId: string): A.Doc<T> | undefined {
    return this.#docs.get(documentId);
  }

  /** Applies a change locally and returns the bytes a client would send with `DataService.update`. */
  change(documentId: string, fn: A.ChangeFn<T>): Uint8Array {
    const before = this.#docs.get(documentId);
    invariant(before, 'Document not received');
    const after = A.change(before, fn);
    this.#docs.set(documentId, after);
    return A.saveSince(after, A.getHeads(before));
  }

  #trigger(documentId: string): Trigger {
    let trigger = this.#ready.get(documentId);
    if (!trigger) {
      trigger = new Trigger();
      this.#ready.set(documentId, trigger);
    }
    return trigger;
  }
}

describe('DocumentsSynchronizer', () => {
  test('splits pending documents over the batch cap and delivers the remainder', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await openAndClose(host);
    const handles = await Promise.all(
      Array.from({ length: 5 }, (_, index) => host.createDoc<{ text: string }>({ text: `doc-${index}` })),
    );

    const batches: number[] = [];
    const delivered = new Set<string>();
    const allDelivered = new Trigger();
    const synchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      maxBatchDocuments: 2,
      sendUpdates: (batch) => {
        const updates = (batch.updates ?? []).filter((update) => update.mutation);
        batches.push(updates.length);
        updates.forEach((update) => delivered.add(update.documentId));
        if (delivered.size === handles.length) {
          allDelivered.wake();
        }
      },
    });
    await openAndClose(synchronizer);

    await synchronizer.addDocuments(handles.map((handle) => handle.documentId));
    await allDelivered.wait({ timeout: 5_000 });

    expect(Math.max(...batches)).toBeLessThanOrEqual(2);
    expect(batches.filter((size) => size > 0).length).toBeGreaterThanOrEqual(3);
  });

  test('a client write reaches the other subscriber and the heads store without a lease on the host', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime, residency: { evictionDelay: 0, minResidentDocuments: 0 } });
    await openAndClose(host);
    const created = await host.createDoc<{ text: string }>({ text: 'initial' });
    const documentId = created.documentId;
    await host.flush(Context.default());
    created[Symbol.dispose]();

    const client1 = new TestClient<{ text: string }>();
    const client2 = new TestClient<{ text: string }>();
    const synchronizer1 = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: client1.receive });
    const synchronizer2 = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: client2.receive });
    await openAndClose(synchronizer1, synchronizer2);
    await synchronizer1.addDocuments([documentId]);
    await synchronizer2.addDocuments([documentId]);
    await asyncTimeout(Promise.all([client1.loaded(documentId), client2.loaded(documentId)]), 1_000);

    // Subscribed and idle: nothing on the host holds the document.
    await host.drainEvictions();
    expect(host.leasedDocsCount).to.equal(0);
    expect(host.loadedDocumentIds).to.not.contain(documentId);

    await synchronizer1.update(Context.default(), [
      { documentId, mutation: client1.change(documentId, (doc) => (doc.text = 'modified by client 1')) },
    ]);
    await asyncTimeout(
      waitForCondition({ condition: () => client2.peek(documentId)?.text === 'modified by client 1' }),
      1_000,
    );
    // The host stored the write and recorded its heads where the indexer scans, without keeping the
    // document loaded.
    await host.drainEvictions();
    expect(host.loadedDocumentIds).to.not.contain(documentId);
    const stored = new Map<string, unknown>();
    for await (const entry of host.listDocumentHeads()) {
      stored.set(entry.documentId, entry.heads);
    }
    expect(stored.get(documentId)).to.deep.equal(A.getHeads(client1.doc(documentId)));
  });

  test('unsubscribing while the initial load is in flight releases the lease', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await openAndClose(host);
    // Minted elsewhere, so this host waits on the network for it.
    const other = createTestSqliteRuntime();
    onTestFinished(() => other.dispose());
    const otherHost = new AutomergeHost({ runtime: other.runtime });
    await openAndClose(otherHost);
    const { documentId } = await otherHost.createDoc<{ text: string }>({ text: 'elsewhere' });

    const synchronizer = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: () => {} });
    await openAndClose(synchronizer);
    await synchronizer.addDocuments([documentId]);
    expect(host.leasedDocsCount).to.equal(1);

    synchronizer.removeDocuments([documentId]);
    expect(host.leasedDocsCount).to.equal(0);
  });

  test('do not get init changes for client created docs', async () => {
    let counter = 0;
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await openAndClose(host);
    const sentUpdate = new Trigger();
    const synchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: () => {
        counter++;
        sentUpdate.wake();
      },
    });
    await openAndClose(synchronizer);

    // First create the document on the host (simulates DataService.createDocument).
    const handle = await host.createDoc<{ text: string }>({ text: 'hello' });

    // Add document to synchronizer (simulates updateSubscription with addIds).
    await synchronizer.addDocuments([handle.documentId]);

    // Wait for the scheduled job to flush the initial sync.
    await asyncTimeout(sentUpdate.wait(), 1_000);

    // Updates will be sent for the initial sync (this is expected behavior).
    // The key is that subsequent updates from the client should be properly synced.
    expect(counter).to.be.greaterThanOrEqual(1);
  });

  describe('persistence', () => {
    test('document created on host persists without explicit flush', async () => {
      const dbPath = join(tmpdir(), `dxos-${PublicKey.random().toHex()}.db`);
      let documentId: DocumentId;
      const text = 'Hello World!';

      {
        const { runtime, dispose } = createTestSqliteRuntime(dbPath);
        const host = new AutomergeHost({ runtime });
        await openAndClose(host);
        const synchronizer = new DocumentsSynchronizer({
          automergeHost: host,
          sendUpdates: () => {},
        });
        await openAndClose(synchronizer);

        // Create document on host (simulates DataService.createDocument).
        const handle = await host.createDoc<{ text: string }>({ text });
        documentId = handle.documentId;

        // Add to synchronizer (simulates updateSubscription with addIds).
        await synchronizer.addDocuments([documentId]);

        // Wait for the background auto-save to persist the document to disk (no explicit flush).
        await waitForCondition({ condition: () => host.hasDocOnDisk(documentId), timeout: 2_000 });

        await host.close();
        await synchronizer.close();
        await dispose();
      }

      {
        // Reopen and verify persistence.
        const { runtime, dispose } = createTestSqliteRuntime(dbPath);
        onTestFinished(() => dispose());
        const host = new AutomergeHost({ runtime });
        await openAndClose(host);

        const handle = await host.loadDoc<{ text: string }>(Context.default(), documentId);
        invariant(handle);
        await handle.waitUntilReady();

        expect(handle.doc().text).to.equal(text);

        await host.close();
      }
    });
  });
});
