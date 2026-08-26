//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { openAndClose } from '@dxos/test-utils';

import { createTestSqliteRuntime } from '../testing';
import { AutomergeHost } from './automerge-host';

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

  test('a document is evicted once its last lease is disposed', async () => {
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
    expect(reloaded!.handle.doc()!.text).toBe('hello');
  });

  test('a document with a second lease outstanding stays resident', async () => {
    const host = await setup();
    using first = await host.createDoc<{ text: string }>({ text: 'hello' });
    await host.flush(Context.default());
    const second = host.acquireDoc(first.documentId);

    second[Symbol.dispose]();
    await host.drainEvictions();
    expect(host.loadedDocumentIds).toContain(first.documentId);
    expect(host.leasedDocsCount).toBe(1);
  });

  test('re-acquiring a document before the drain cancels its eviction', async () => {
    const host = await setup();
    const created = await host.createDoc<{ text: string }>({ text: 'hello' });
    await host.flush(Context.default());
    const documentId = created.documentId;

    // Eviction is deferred, so the reacquisition lands in the window a query pass would use.
    created[Symbol.dispose]();
    using reacquired = host.acquireDoc<{ text: string }>(documentId);
    await host.drainEvictions();

    expect(host.loadedDocumentIds).toContain(documentId);
    expect(reacquired.handle.doc()!.text).toBe('hello');
  });

  test('evicting a document that was never flushed persists it first', async () => {
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
    expect(reloaded!.handle.doc()!.text).toBe('unflushed');
  });

  test('disposal is idempotent, and the document is unreachable afterwards', async () => {
    const host = await setup();
    const lease = await host.createDoc<{ text: string }>({ text: 'hello' });
    await host.flush(Context.default());

    lease[Symbol.dispose]();
    lease[Symbol.dispose]();
    expect(lease.disposed).toBe(true);
    // The id still reads: it names a document rather than claiming one.
    expect(lease.documentId).toBeTypeOf('string');
    expect(() => lease.handle).toThrow();
  });

  test('a write through one lease is visible through another', async () => {
    const host = await setup();
    using first = await host.createDoc<{ text: string }>({ text: 'hello' });
    using second = host.acquireDoc<{ text: string }>(first.documentId);

    first.handle.change((doc) => {
      doc.text = 'written';
    });
    // One handle per document, so the second lease is a second reference to it, not a second copy.
    expect(second.handle.doc()!.text).toBe('written');
    expect(second.handle).toBe(first.handle);
  });
});
