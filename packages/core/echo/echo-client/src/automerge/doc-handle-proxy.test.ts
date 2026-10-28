//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { generateAutomergeUrl } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { AutomergeHost, DocumentsSynchronizer } from '@dxos/echo-host';
import { createTestSqliteRuntime } from '@dxos/echo-host/testing';
import { openAndClose } from '@dxos/test-utils';

import { DocumentUnavailableError } from '../errors.ts';
import { DocHandleProxy } from './doc-handle-proxy.ts';
import { toDocumentId } from './document-id.ts';

/** Any well-formed document id; these tests never reach a host. */
const DOCUMENT_ID = toDocumentId(generateAutomergeUrl());

describe('DocHandleProxy', () => {
  test('get update from handle', async () => {
    const text = 'Hello World!';

    const { host } = await setup();
    // Create document on host first so synchronizer can load it.
    const workerHandle = await host.createDoc<{ text: string }>();
    const documentId = workerHandle.documentId;

    const clientHandle = new DocHandleProxy<{ text: string }>({ onDelete: () => {} });
    clientHandle._setDocumentId(documentId);
    clientHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    const docsSynchronizer = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: () => {} });
    await openAndClose(docsSynchronizer);
    await docsSynchronizer.addDocuments([{ documentId }]);

    const mutation = clientHandle._getPendingChanges()!;
    await docsSynchronizer.update(Context.default(), [{ documentId, mutation }]);
    expect(workerHandle.doc()?.text).to.equal(text);
  });

  test('update handle with foreign mutation', async () => {
    const text = 'Hello World!';

    const { host } = await setup();
    const workerHandle = await host.createDoc<{ text: string }>();

    const clientHandle = new DocHandleProxy<{ text: string }>({
      documentId: workerHandle.documentId,
      onDelete: () => {},
    });

    const docsSynchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: ({ updates }) => {
        updates?.forEach((update) => clientHandle._integrateHostUpdate(update.mutation));
      },
    });
    await openAndClose(docsSynchronizer);
    await docsSynchronizer.addDocuments([{ documentId: workerHandle.documentId }]);
    workerHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    expect(clientHandle.doc().text).to.equal;
  });

  test('foreign and intrinsic mutation', async () => {
    const clientText = 'Hello World from client!';
    const foreignPeerText = 'Hello World from foreign peer!';
    type DocType = { clientText: string; foreignPeerText: string };

    const { host } = await setup();
    const workerHandle = await host.createDoc<DocType>();
    const synchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: ({ updates }) => updates?.forEach((update) => clientHandle._integrateHostUpdate(update.mutation)),
    });
    await openAndClose(synchronizer);
    workerHandle.change((doc: DocType) => {
      doc.foreignPeerText = foreignPeerText;
    });

    const clientHandle = new DocHandleProxy<DocType>({
      documentId: workerHandle.documentId,
      onDelete: () => {},
    });
    clientHandle.change((doc: DocType) => {
      doc.clientText = clientText;
    });

    // Send foreign mutation to client.
    const clientReceiveChange = new Trigger();
    clientHandle.once('change', () => clientReceiveChange.wake());
    await synchronizer.addDocuments([{ documentId: workerHandle.documentId }]);
    await clientReceiveChange.wait();

    // Send client mutation to foreign peer.
    const clientUpdate = clientHandle._getPendingChanges()!;
    await synchronizer.update(Context.default(), [{ documentId: workerHandle.documentId, mutation: clientUpdate }]);

    for (const handle of [clientHandle, workerHandle] as const) {
      expect(handle.doc()?.clientText).to.equal(clientText);
      expect(handle.doc()?.foreignPeerText).to.equal(foreignPeerText);
    }
  });

  test('every write of a scope applies at the heads shown, and the stored changes after them fold in as it closes', () => {
    const base = A.from<{ tags: string[] }>({ tags: ['a', 'b'] });
    const stored = A.change(A.clone(base), (doc) => {
      doc.tags.unshift('host');
    });
    const handle = new DocHandleProxy<{ tags: string[] }>({
      documentId: DOCUMENT_ID,
      passive: { bytes: A.save(stored), heads: A.getHeads(base) },
      onDelete: () => {},
    });

    handle.batch(() => {
      handle.change((doc) => {
        doc.tags.splice(0, 1);
      });
      handle.change((doc) => {
        doc.tags.splice(0, 1);
      });
      expect([...handle.doc().tags]).toEqual([]);
      handle.on('change', () => {
        throw new Error('listener failed');
      });
    });
    expect([...handle.doc().tags]).toEqual(['host']);
    expect(handle._getPendingChanges()).toEqual(A.saveSince(handle.doc(), A.getHeads(stored)));
  });

  test('a passive update with a directory moves the shown heads without loading the document', () => {
    const base = A.from<{ links: Record<string, string> }>({ links: {} });
    const next = A.change(A.clone(base), (doc) => {
      doc.links.a = 'automerge:a';
    });
    const handle = new DocHandleProxy<{ links: Record<string, string> }>({
      documentId: DOCUMENT_ID,
      passive: { bytes: A.save(base), heads: A.getHeads(base) },
      onDelete: () => {},
    });
    const directories: (string | undefined)[] = [];
    handle.on('passive', ({ directory }) => directories.push(directory));

    const directory = JSON.stringify({ links: { a: 'automerge:a' } });
    handle._integratePassiveUpdate(A.saveSince(next, A.getHeads(base)), { heads: A.getHeads(next), directory });
    expect(directories).toEqual([directory]);
    expect(handle.state).toBe('passive');
    expect(handle.passiveHeads).toEqual(A.getHeads(next));
    expect(handle.doc().links).toEqual({ a: 'automerge:a' });
  });

  test('a link delta from heads the handle does not show is not applied', () => {
    const base = A.from<{ links: Record<string, string> }>({ links: {} });
    const handle = new DocHandleProxy<{ links: Record<string, string> }>({
      documentId: DOCUMENT_ID,
      passive: { bytes: A.save(base), heads: A.getHeads(base) },
      onDelete: () => {},
    });
    const deltas: (string | undefined)[] = [];
    handle.on('passive', ({ directoryLinks }) => deltas.push(directoryLinks));
    const links = JSON.stringify({ a: 'automerge:a' });

    handle._integratePassiveUpdate(undefined, { heads: ['other'], directoryDelta: { base: ['elsewhere'], links } });
    expect(deltas).toEqual([undefined]);
    expect(handle.passiveHeads).toEqual(A.getHeads(base));

    handle._integratePassiveUpdate(undefined, { heads: ['next'], directoryDelta: { base: A.getHeads(base), links } });
    expect(deltas).toEqual([undefined, links]);
    expect(handle.passiveHeads).toEqual(['next']);
  });

  test('a document the host cannot produce fails its waiters', async () => {
    const handle = new DocHandleProxy<{ text: string }>({ documentId: DOCUMENT_ID, onDelete: () => {} });
    const ready = handle.whenReady();

    handle._markUnavailable(DOCUMENT_ID);

    await expect(ready).rejects.toThrow(DocumentUnavailableError);
    expect(handle.state).to.equal('unavailable');
    // A document the host has no bytes for is not on its disk either.
    expect(await handle.whenSettledOnDisk()).to.be.false;
  });

  test('bytes arriving after an unavailable verdict make the handle ready', async () => {
    const text = 'delivered late';
    const source = new DocHandleProxy<{ text: string }>({ documentId: DOCUMENT_ID, onDelete: () => {} });
    source.change((doc: { text: string }) => {
      doc.text = text;
    });

    const handle = new DocHandleProxy<{ text: string }>({ documentId: DOCUMENT_ID, onDelete: () => {} });
    handle._markUnavailable(DOCUMENT_ID);
    await expect(handle.whenReady()).rejects.toThrow(DocumentUnavailableError);

    // The waiter the verdict failed holds a rejected promise, so the transition is announced: it is
    // the only thing that can tell a caller the document it gave up on has arrived.
    const available = new Trigger();
    handle.once('available', () => available.wake());

    // Replication catching up supersedes the verdict, so a space that was unopenable opens on a
    // later attempt rather than staying failed for the life of the handle.
    handle._integrateHostUpdate(source._getPendingChanges()!);

    await available.wait({ timeout: 1000 });
    await handle.whenReady();
    expect(handle.state).to.equal('ready');
    expect(handle.doc().text).to.equal(text);
  });

  test('a handle that was never unavailable does not announce availability', async () => {
    const source = new DocHandleProxy<{ text: string }>({ documentId: DOCUMENT_ID, onDelete: () => {} });
    source.change((doc: { text: string }) => {
      doc.text = 'ordinary load';
    });

    const handle = new DocHandleProxy<{ text: string }>({ documentId: DOCUMENT_ID, onDelete: () => {} });
    let announced = false;
    handle.once('available', () => {
      announced = true;
    });

    handle._integrateHostUpdate(source._getPendingChanges()!);

    await handle.whenReady();
    // Only the recovery transition carries the event; every load would otherwise emit one.
    expect(announced).to.be.false;
  });
});

const setup = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new AutomergeHost({ runtime });
  await openAndClose(host);
  return { dispose, host };
};
