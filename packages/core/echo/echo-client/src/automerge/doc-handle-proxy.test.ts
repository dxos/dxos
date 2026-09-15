//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { AutomergeHost, DocumentsSynchronizer } from '@dxos/echo-host';
import { createTestSqliteRuntime } from '@dxos/echo-host/testing';
import { openAndClose } from '@dxos/test-utils';

import { DocHandleProxy } from './doc-handle-proxy.ts';

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
    await docsSynchronizer.addDocuments([documentId]);

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
    await docsSynchronizer.addDocuments([workerHandle.documentId]);
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
    await synchronizer.addDocuments([workerHandle.documentId]);
    await clientReceiveChange.wait();

    // Send client mutation to foreign peer.
    const clientUpdate = clientHandle._getPendingChanges()!;
    await synchronizer.update(Context.default(), [{ documentId: workerHandle.documentId, mutation: clientUpdate }]);

    for (const handle of [clientHandle, workerHandle] as const) {
      expect(handle.doc()?.clientText).to.equal(clientText);
      expect(handle.doc()?.foreignPeerText).to.equal(foreignPeerText);
    }
  });

  test('a change listener that throws does not mark the document for rebuild', ({ expect }) => {
    const host = A.change(A.init<{ text: string }>(), (doc) => {
      doc.text = 'from host';
    });
    const handle = new DocHandleProxy<{ text: string }>({ onDelete: () => {} });
    handle.on('change', () => {
      throw new Error('listener failed');
    });

    expect(() => handle._integrateHostUpdate(A.save(host))).toThrow('listener failed');
    expect(handle._isAwaitingRebuild()).toBe(false);
    expect(handle.doc().text).toBe('from host');
  });

  test('a document awaiting rebuild is neither sent nor acknowledged until the host copy replaces it', ({ expect }) => {
    const handle = new DocHandleProxy<{ text: string }>({ onDelete: () => {} });
    handle.change((doc: { text: string }) => {
      doc.text = 'unconfirmed';
    });
    handle._markForRebuild();

    expect(handle._getPendingChanges()).toBeUndefined();
    expect(handle._isAcknowledged()).toBe(false);

    const host = A.change(A.init<{ text: string }>(), (doc) => {
      doc.text = 'from host';
    });
    handle._rebuild(A.save(host));
    expect(handle._isAwaitingRebuild()).toBe(false);
    expect(handle.doc().text).toBe('from host');
    expect(handle._isAcknowledged()).toBe(true);
  });
});

const setup = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new AutomergeHost({ runtime });
  await openAndClose(host);
  return { dispose, host };
};
