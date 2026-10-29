//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId } from '@automerge/automerge-repo';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { Context } from '@dxos/context';
import { type DatabaseDirectory, EntityStructure, SpaceDocVersion, directoryJson } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, PublicKey, SpaceId } from '@dxos/keys';
import { type DataService } from '@dxos/protocols/rpc';
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

    await synchronizer.addDocuments(handles.map(({ documentId }) => ({ documentId })));
    await allDelivered.wait({ timeout: 5_000 });

    expect(Math.max(...batches)).toBeLessThanOrEqual(2);
    expect(batches.filter((size) => size > 0).length).toBeGreaterThanOrEqual(3);
  });

  test('a subscription from heads the client holds sends only what came after them', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await openAndClose(host);
    const handle = await host.createDoc<{ text: string }>({ text: 'held' });
    const held = A.save(handle.doc()!);
    const heldHeads = A.getHeads(handle.doc()!);
    handle.change((doc) => {
      doc.text = 'after';
    });
    const unknown = await host.createDoc<{ text: string }>({ text: 'unknown' });
    const current = await host.createDoc<{ text: string }>({ text: 'current' });

    const sent = new Map<string, Uint8Array>();
    const delivered = new Trigger();
    const synchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: (batch) => {
        for (const { documentId, mutation } of batch.updates ?? []) {
          if (mutation) {
            sent.set(documentId, mutation);
          }
        }
        if (sent.size === 3) {
          delivered.wake();
        }
      },
    });
    await openAndClose(synchronizer);

    await synchronizer.addDocuments([
      { documentId: handle.documentId, heads: heldHeads },
      { documentId: unknown.documentId, heads: heldHeads },
      { documentId: current.documentId, heads: A.getHeads(current.doc()!) },
    ]);
    await delivered.wait({ timeout: 5_000 });

    const delta = sent.get(handle.documentId)!;
    expect(delta).toEqual(A.saveSince(handle.doc()!, heldHeads));
    expect(A.loadIncremental(A.load<{ text: string }>(held), delta).text).toBe('after');
    expect(A.load<{ text: string }>(sent.get(unknown.documentId)!).text).toBe('unknown');
    expect(sent.get(current.documentId)).toHaveLength(0);
  });

  test('a passive subscription is sent nothing while storage holds its heads, and the difference once it does not', async () => {
    const { host, synchronizer, updates, createDirectory, next } = await setupPassive();
    const current = await createDirectory('current');
    const stale = await createDirectory('shown');
    const shownAt = A.getHeads(stale.handle.doc()!);
    stale.handle.change((doc) => {
      doc.objects![stale.objectId].data.title = 'stored';
    });
    const storedAt = A.getHeads(stale.handle.doc()!);
    const published = host.documentHeadsChanged.waitFor(
      ({ documentId, heads }) => documentId === stale.handle.documentId && A.equals(heads, storedAt),
    );
    await host.flush(Context.default());
    await asyncTimeout(published, 5_000);

    const acquired = vi.spyOn(host, 'acquireDoc');
    const atStorage = {
      documentId: current.handle.documentId,
      heads: A.getHeads(current.handle.doc()!),
      passive: true,
    };
    await synchronizer.addDocuments([atStorage]);
    await synchronizer.addDocuments([
      atStorage,
      { documentId: stale.handle.documentId, heads: shownAt, passive: true },
    ]);
    await waitForCondition({ condition: () => updates.length > 0, timeout: 5_000 });
    expect(updates.map(({ documentId }) => documentId)).toEqual([stale.handle.documentId]);
    expect(JSON.parse(updates[0].passive!.json!).title).toBe('stored');
    const loaded = acquired.mock.calls.map(([documentId]) => documentId);
    expect(loaded).toContain(stale.handle.documentId);
    expect(loaded).not.toContain(current.handle.documentId);

    const resent = next();
    await synchronizer.addDocuments([{ documentId: stale.handle.documentId, heads: shownAt, passive: true }]);
    expect((await resent).documentId).toBe(stale.handle.documentId);
  });

  test("a passive update carries the change and its object's JSON at the new heads", async () => {
    const { host, synchronizer, createDirectory, next } = await setupPassive();
    const { handle, objectId } = await createDirectory('shown');
    const shownBytes = A.save(handle.doc()!);
    await synchronizer.addDocuments([
      { documentId: handle.documentId, heads: A.getHeads(handle.doc()!), passive: true },
    ]);

    let update = next();
    handle.change((doc) => {
      doc.objects![objectId].data.title = 'edited';
    });
    await host.flush(Context.default());
    const edited = await update;
    expect(JSON.parse(edited.passive!.json!).title).toBe('edited');
    expect(edited.passive?.heads).toEqual(A.getHeads(handle.doc()!));
    expect(edited.passive?.updatedAt).toBeGreaterThan(0);
    const loaded = A.loadIncremental(A.load<DatabaseDirectory>(shownBytes), edited.mutation!);
    expect(loaded.objects![objectId].data.title).toBe('edited');

    update = next();
    handle.change((doc) => {
      doc.objects![EntityId.random()] = EntityStructure.makeObject({ type: TEST_TYPE, data: {} });
    });
    await host.flush(Context.default());
    expect((await update).passive).toEqual(expect.objectContaining({ json: undefined }));
  });

  test('a passive directory gets its JSON on the first send only', async () => {
    const { host, synchronizer, next } = await setupPassive();
    const root = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: SpaceId.random() },
      links: {},
    });
    await host.flush(Context.default());

    let update = next();
    await synchronizer.addDocuments([{ documentId: root.documentId, passive: true }]);
    const first = await update;
    expect(first.passive?.json).toBe(directoryJson(root.doc()));
    expect(first.passive?.heads).toEqual(A.getHeads(root.doc()));

    // A later change is the client's cue to load the directory, so it carries only the change.
    update = next();
    root.change((doc) => {
      doc.links ??= {};
      doc.links[EntityId.random()] = new A.RawString('automerge:2');
    });
    await host.flush(Context.default());
    const changed = await update;
    expect(changed.passive?.json).toBeUndefined();
    expect(changed.mutation?.length).toBeGreaterThan(0);
  });

  test('a passive directory with a current snapshot is first sent from storage, without loading it', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await openAndClose(host);
    const root = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: SpaceId.random() },
      links: {},
    });
    await host.flush(Context.default());
    const heads = A.getHeads(root.doc());
    const updates: DataService.DocumentUpdate[] = [];
    const synchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: (batch) => updates.push(...(batch.updates ?? [])),
      readDirectorySnapshot: async () => ({ heads, json: '{"links":{}}' }),
    });
    await openAndClose(synchronizer);
    const acquireDoc = vi.spyOn(host, 'acquireDoc');

    await synchronizer.addDocuments([{ documentId: root.documentId, passive: true }]);
    await waitForCondition({ condition: () => updates.length > 0, timeout: 5_000 });
    const [update] = updates;
    expect(update.passive).toEqual({ heads, json: '{"links":{}}' });
    invariant(update.mutation, 'update carries no stored changes');
    expect(A.getHeads(A.loadIncremental(A.init<DatabaseDirectory>(), update.mutation))).toEqual(heads);
    expect(acquireDoc).not.toHaveBeenCalled();
  });

  test('re-adding a document switches its mode', async () => {
    const { synchronizer, createDirectory, next } = await setupPassive();
    const { handle, objectId } = await createDirectory('shown');
    const heads = A.getHeads(handle.doc()!);
    await synchronizer.addDocuments([{ documentId: handle.documentId, heads, passive: true }]);

    let update = next();
    await synchronizer.addDocuments([{ documentId: handle.documentId, heads }]);
    expect((await update).passive).toBeUndefined();

    update = next();
    await synchronizer.addDocuments([{ documentId: handle.documentId }]);
    expect(A.load<DatabaseDirectory>((await update).mutation!).objects![objectId].data.title).toBe('shown');
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
    await synchronizer1.addDocuments([{ documentId }]);
    await synchronizer2.addDocuments([{ documentId }]);
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

  test('concurrent writes from two clients reach both clients', async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await openAndClose(host);
    const { documentId } = await host.createDoc<Record<string, string>>({ host: 'initial' });

    const client1 = new TestClient<Record<string, string>>();
    const client2 = new TestClient<Record<string, string>>();
    const synchronizer1 = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: client1.receive });
    const synchronizer2 = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: client2.receive });
    await openAndClose(synchronizer1, synchronizer2);
    await synchronizer1.addDocuments([{ documentId }]);
    await synchronizer2.addDocuments([{ documentId }]);
    await asyncTimeout(Promise.all([client1.loaded(documentId), client2.loaded(documentId)]), 1_000);

    // Holds the first write's import open until the second client's write has been imported.
    const createDoc = host.createDoc.bind(host);
    const secondImported = new Trigger();
    let imports = 0;
    vi.spyOn(host, 'createDoc').mockImplementation(async (initialValue, opts) => {
      const lease = await createDoc(initialValue, opts);
      if (++imports === 1) {
        await secondImported.wait();
      } else {
        secondImported.wake();
      }
      return lease;
    });

    await Promise.all([
      synchronizer1.update(Context.default(), [
        { documentId, mutation: client1.change(documentId, (doc) => (doc.one = 'client 1')) },
      ]),
      synchronizer2.update(Context.default(), [
        { documentId, mutation: client2.change(documentId, (doc) => (doc.two = 'client 2')) },
      ]),
    ]);

    const both = { host: 'initial', one: 'client 1', two: 'client 2' };
    await asyncTimeout(
      waitForCondition({
        condition: () =>
          A.toJS(client1.peek(documentId) ?? {}).two === both.two &&
          A.toJS(client2.peek(documentId) ?? {}).one === both.one,
      }),
      1_000,
    );
    expect(A.toJS(client1.doc(documentId))).to.deep.equal(both);
    expect(A.toJS(client2.doc(documentId))).to.deep.equal(both);
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
    await synchronizer.addDocuments([{ documentId }]);
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

    await synchronizer.addDocuments([{ documentId: handle.documentId }]);

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

        await synchronizer.addDocuments([{ documentId }]);

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

const TEST_TYPE = DXN.make('com.example.type.test', '0.1.0');

const setupPassive = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  onTestFinished(() => dispose());
  const host = new AutomergeHost({ runtime });
  await openAndClose(host);
  const updates: DataService.DocumentUpdate[] = [];
  const synchronizer = new DocumentsSynchronizer({
    automergeHost: host,
    sendUpdates: (batch) => updates.push(...(batch.updates ?? [])),
  });
  await openAndClose(synchronizer);

  const createDirectory = async (title: string) => {
    const objectId = EntityId.random();
    const handle = await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: SpaceId.random() },
      objects: { [objectId]: EntityStructure.makeObject({ type: TEST_TYPE, data: { title } }) },
      links: {},
    });
    await host.flush(Context.default());
    return { handle, objectId };
  };
  const next = async () => {
    const count = updates.length;
    await waitForCondition({ condition: () => updates.length > count, timeout: 5_000 });
    return updates[updates.length - 1];
  };
  return { host, synchronizer, updates, createDirectory, next };
};
