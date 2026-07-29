//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { AutomergeHost, DocumentsSynchronizer } from '@dxos/echo-host';
import { createTestSqliteRuntime } from '@dxos/echo-host/testing';
import { openAndClose } from '@dxos/test-utils';

import { DocHandleProxy } from './doc-handle-proxy';

describe('DocHandleProxy', () => {
  // Two `_sendUpdates` passes can be in flight for one handle (`UpdateScheduler.runBlocking` and a
  // `trigger`-scheduled pass both clear the same barrier). The staged heads used to live in a single
  // field on the handle, so whichever pass was acknowledged first advanced `_lastSentHeads` to the
  // heads the *other* pass had staged — and if that other pass then failed, `saveSince` had nothing
  // left to report and its changes were never resent. Silent, permanent loss (dxos/edge#758).
  test('acknowledging one send does not mark a concurrent send as delivered', () => {
    const handle = new DocHandleProxy<{ first?: string; second?: string }>({ initialValue: {} });
    handle._setDocumentId('doc-1' as any);

    handle.change((doc) => {
      doc.first = 'a';
    });
    const firstSend = handle._getPendingChanges()!;
    expect(firstSend).toBeDefined();

    // A second pass stages its own, larger batch before the first is acknowledged.
    handle.change((doc) => {
      doc.second = 'b';
    });
    const secondSend = handle._getPendingChanges()!;
    expect(secondSend).toBeDefined();
    expect(secondSend.heads).not.toEqual(firstSend.heads);

    // Only the first send lands; the second one fails and is re-queued by its caller.
    handle._confirmSync(firstSend.heads);

    // The second change must still be pending — this returned `undefined` before the fix.
    const retry = handle._getPendingChanges();
    expect(retry, 'the unacknowledged change must still be pending').toBeDefined();
    expect(handle.doc()!.second).toEqual('b');

    // Once it is acknowledged too, nothing is left over.
    handle._confirmSync(retry!.heads);
    expect(handle._getPendingChanges()).toBeUndefined();
  });

  // Acknowledgements can arrive out of order; a later one must not un-confirm delivered changes.
  test('an out-of-order acknowledgement does not move the sync point backwards', () => {
    const handle = new DocHandleProxy<{ first?: string; second?: string }>({ initialValue: {} });
    handle._setDocumentId('doc-2' as any);

    handle.change((doc) => {
      doc.first = 'a';
    });
    const firstSend = handle._getPendingChanges()!;
    handle.change((doc) => {
      doc.second = 'b';
    });
    const secondSend = handle._getPendingChanges()!;

    // Both land, but the acknowledgements are processed newest-first.
    handle._confirmSync(secondSend.heads);
    handle._confirmSync(firstSend.heads);

    expect(handle._getPendingChanges(), 'everything was delivered').toBeUndefined();
  });

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

    const { mutation } = clientHandle._getPendingChanges()!;
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
    const { mutation: clientUpdate } = clientHandle._getPendingChanges()!;
    await synchronizer.update(Context.default(), [{ documentId: workerHandle.documentId, mutation: clientUpdate }]);

    for (const handle of [clientHandle, workerHandle] as const) {
      expect(handle.doc()?.clientText).to.equal(clientText);
      expect(handle.doc()?.foreignPeerText).to.equal(foreignPeerText);
    }
  });
});

const setup = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new AutomergeHost({ runtime });
  await openAndClose(host);
  return { dispose, host };
};
