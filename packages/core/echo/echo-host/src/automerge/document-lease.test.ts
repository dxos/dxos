//
// Copyright 2026 DXOS.org
//

import { type DocumentId } from '@automerge/automerge-repo';
import { describe, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { openAndClose } from '@dxos/test-utils';

import { createTestSqliteRuntime } from '../testing';
import { AutomergeHost } from './automerge-host';
import { DocumentLeaseRegistry } from './document-lease';

/**
 * The repo caches a document forever once anything faults it in, so residency is the host's to
 * decide: these pin the reference-counting rules that decision rests on.
 */
describe('document leases', () => {
  const setup = async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    onTestFinished(() => dispose());
    const host = new AutomergeHost({ runtime });
    await openAndClose(host);
    return host;
  };

  test('a document is evicted once its last lease is disposed', async ({ expect }) => {
    const host = await setup();
    const created = await host.createDoc<{ text: string }>({ text: 'hello' });
    const documentId = created.documentId;
    await host.flush(Context.default());
    created[Symbol.dispose]();
    await host.drainEvictions();

    expect(host.leasedDocsCount).toBe(0);
    expect(host.loadedDocumentIds).not.toContain(documentId);

    // Evicting unloads, never deletes: the document reads back from disk with its content.
    using reloaded = await host.loadDoc<{ text: string }>(Context.default(), documentId);
    expect(reloaded!.doc()!.text).toBe('hello');
  });

  test('a document with a second lease outstanding stays resident', async ({ expect }) => {
    const host = await setup();
    using first = await host.createDoc<{ text: string }>({ text: 'hello' });
    await host.flush(Context.default());
    const second = host.acquireDoc(first.documentId);

    second[Symbol.dispose]();
    await host.drainEvictions();
    expect(host.loadedDocumentIds).toContain(first.documentId);
    expect(host.leasedDocsCount).toBe(1);
  });

  test('re-acquiring a document before the drain cancels its eviction', async ({ expect }) => {
    const host = await setup();
    const created = await host.createDoc<{ text: string }>({ text: 'hello' });
    await host.flush(Context.default());
    const documentId = created.documentId;

    // Eviction is deferred, so the reacquisition lands in the window a query pass would use.
    created[Symbol.dispose]();
    using reacquired = host.acquireDoc<{ text: string }>(documentId);
    await host.drainEvictions();

    expect(host.loadedDocumentIds).toContain(documentId);
    expect(reacquired.doc()!.text).toBe('hello');
  });

  test('evicting a document that was never flushed persists it first', async ({ expect }) => {
    const host = await setup();
    // An unsaved document exists only in memory, so eviction has to write it out before dropping the
    // handle — otherwise releasing a freshly created object would lose it.
    const created = await host.createDoc<{ text: string }>({ text: 'unflushed' });
    const documentId = created.documentId;
    created[Symbol.dispose]();
    await host.drainEvictions();
    expect(host.loadedDocumentIds).not.toContain(documentId);

    using reloaded = await host.loadDoc<{ text: string }>(Context.default(), documentId, {
      fetchFromNetwork: false,
    });
    expect(reloaded!.doc()!.text).toBe('unflushed');
  });

  test('disposal is idempotent, and the document is unreachable afterwards', async ({ expect }) => {
    const host = await setup();
    const lease = await host.createDoc<{ text: string }>({ text: 'hello' });
    await host.flush(Context.default());

    lease[Symbol.dispose]();
    lease[Symbol.dispose]();
    expect(lease.disposed).toBe(true);
    // The id still reads: it names a document rather than claiming one.
    expect(lease.documentId).toBeTypeOf('string');
    expect(() => lease.doc()).toThrow();
  });

  test('a write through one lease is visible through another', async ({ expect }) => {
    const host = await setup();
    using first = await host.createDoc<{ text: string }>({ text: 'hello' });
    using second = host.acquireDoc<{ text: string }>(first.documentId);

    first.change((doc) => {
      doc.text = 'written';
    });
    // One document per id, so the second lease reads the write made through the first rather than
    // its own copy.
    expect(second.doc()!.text).toBe('written');
    expect(second.heads()).toEqual(first.heads());
  });
});

/**
 * Residency policy in isolation: a released document waits out an idle delay, and the most recently
 * released ones are held by a floor regardless of age.
 */
describe('document lease eviction policy', () => {
  const createRegistry = (
    params: { evictionDelay?: number; minResidentDocuments?: number },
    /** Resolves `false` to leave the document resident, as a real deferred eviction does. */
    outcome: (documentId: DocumentId, attempt: number) => boolean = () => true,
  ) => {
    const evicted: DocumentId[] = [];
    const attempts = new Map<DocumentId, number>();
    const registry = new DocumentLeaseRegistry({
      open: () => ({}) as any,
      evict: async (documentId) => {
        const attempt = (attempts.get(documentId) ?? 0) + 1;
        attempts.set(documentId, attempt);
        const dropped = outcome(documentId, attempt);
        if (dropped) {
          evicted.push(documentId);
        }
        return dropped;
      },
      ...params,
    });
    onTestFinished(() => registry.close());
    return { registry, evicted, attempts };
  };

  const documentId = (index: number) => `document-${index}` as DocumentId;

  /** Polls rather than sleeping past the delay, so a slow machine does not turn into a flake. */
  const waitFor = async (condition: () => boolean) => {
    for (let attempt = 0; attempt < 100 && !condition(); ++attempt) {
      await sleep(10);
    }
  };

  test('a released document is not evicted until the delay has elapsed', async ({ expect }) => {
    const { registry, evicted } = createRegistry({ evictionDelay: 100 });
    registry.acquire(documentId(0))[Symbol.dispose]();

    await sleep(20);
    expect(evicted).toEqual([]);
    expect(registry.idleCount).toBe(1);

    await waitFor(() => evicted.length > 0);
    expect(evicted).toEqual([documentId(0)]);
    expect(registry.idleCount).toBe(0);
  });

  test('the most recently released documents are held by the floor', async ({ expect }) => {
    const { registry, evicted } = createRegistry({ evictionDelay: 1, minResidentDocuments: 2 });
    for (let index = 0; index < 4; ++index) {
      registry.acquire(documentId(index))[Symbol.dispose]();
    }

    // Oldest release first, and the two newest stay resident however long they idle.
    await waitFor(() => evicted.length >= 2);
    expect(evicted).toEqual([documentId(0), documentId(1)]);
    await sleep(20);
    expect(evicted).toEqual([documentId(0), documentId(1)]);
    expect(registry.idleCount).toBe(2);
  });

  test('a document left resident is retried rather than forgotten', async ({ expect }) => {
    // A document that is still loading cannot be dropped, and the registry has already taken it off
    // the queue — without a requeue it would stay resident with nothing tracking it.
    const { registry, evicted, attempts } = createRegistry({ evictionDelay: 1 }, (_id, attempt) => attempt > 1);
    registry.acquire(documentId(0))[Symbol.dispose]();

    await waitFor(() => evicted.length > 0);
    expect(evicted).toEqual([documentId(0)]);
    expect(attempts.get(documentId(0))).toBe(2);
    expect(registry.idleCount).toBe(0);
  });

  test('draining ignores both the delay and the floor', async ({ expect }) => {
    const { registry, evicted } = createRegistry({ evictionDelay: 60_000, minResidentDocuments: 8 });
    for (let index = 0; index < 3; ++index) {
      registry.acquire(documentId(index))[Symbol.dispose]();
    }

    await registry.drain();
    expect(evicted).toEqual([documentId(0), documentId(1), documentId(2)]);
    expect(registry.idleCount).toBe(0);
  });

  test('re-acquiring during the delay leaves the document alone', async ({ expect }) => {
    const { registry, evicted } = createRegistry({ evictionDelay: 50 });
    registry.acquire(documentId(0))[Symbol.dispose]();
    const reacquired = registry.acquire(documentId(0));

    await sleep(100);
    expect(evicted).toEqual([]);
    expect(registry.isLeased(documentId(0))).toBe(true);

    reacquired[Symbol.dispose]();
    await waitFor(() => evicted.length > 0);
    expect(evicted).toEqual([documentId(0)]);
  });
});
