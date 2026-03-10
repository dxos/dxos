//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { AutomergeHost, DocumentsSynchronizer } from '@dxos/echo-pipeline';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { DocHandleProxy } from './doc-handle-proxy';

describe('DocHandleProxy', () => {
  test('get update from handle', async () => {
    const text = 'Hello World!';

    const { host } = await setup();
    // Create document on host first so synchronizer can load it.
    const workerHandle = await host.createDoc<{ text: string }>(Context.default());
    const documentId = workerHandle.documentId;

    const clientHandle = new DocHandleProxy<{ text: string }>({ onDelete: () => {} });
    clientHandle._setDocumentId(Context.default(), documentId);
    clientHandle.change(Context.default(), (doc: { text: string }) => {
      doc.text = text;
    });

    const docsSynchronizer = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: () => {} });
    await openAndClose(docsSynchronizer);
    await docsSynchronizer.addDocuments(Context.default(), [documentId]);

    const mutation = clientHandle._getPendingChanges(Context.default())!;
    await docsSynchronizer.update(Context.default(), [{ documentId, mutation }]);
    expect(workerHandle.doc()?.text).to.equal(text);
  });

  test('update handle with foreign mutation', async () => {
    const text = 'Hello World!';

    const { host } = await setup();
    const workerHandle = await host.createDoc<{ text: string }>(Context.default());

    const clientHandle = new DocHandleProxy<{ text: string }>({
      documentId: workerHandle.documentId,
      onDelete: () => {},
    });

    const docsSynchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: ({ updates }) => {
        updates?.forEach((update) => clientHandle._integrateHostUpdate(Context.default(), update.mutation));
      },
    });
    await openAndClose(docsSynchronizer);
    await docsSynchronizer.addDocuments(Context.default(), [workerHandle.documentId]);
    workerHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    expect(clientHandle.doc(Context.default()).text).to.equal;
  });

  test('foreign and intrinsic mutation', async () => {
    const clientText = 'Hello World from client!';
    const foreignPeerText = 'Hello World from foreign peer!';
    type DocType = { clientText: string; foreignPeerText: string };

    const { host } = await setup();
    const workerHandle = await host.createDoc<DocType>(Context.default());
    const synchronizer = new DocumentsSynchronizer({
      automergeHost: host,
      sendUpdates: ({ updates }) =>
        updates?.forEach((update) => clientHandle._integrateHostUpdate(Context.default(), update.mutation)),
    });
    await openAndClose(synchronizer);
    workerHandle.change((doc: DocType) => {
      doc.foreignPeerText = foreignPeerText;
    });

    const clientHandle = new DocHandleProxy<DocType>({
      documentId: workerHandle.documentId,
      onDelete: () => {},
    });
    clientHandle.change(Context.default(), (doc: DocType) => {
      doc.clientText = clientText;
    });

    // Send foreign mutation to client.
    const clientReceiveChange = new Trigger();
    clientHandle.once('change', () => clientReceiveChange.wake());
    await synchronizer.addDocuments(Context.default(), [workerHandle.documentId]);
    await clientReceiveChange.wait();

    // Send client mutation to foreign peer.
    const clientUpdate = clientHandle._getPendingChanges(Context.default())!;
    await synchronizer.update(Context.default(), [{ documentId: workerHandle.documentId, mutation: clientUpdate }]);

    for (const handle of [clientHandle, workerHandle] as const) {
      expect(handle.doc(Context.default())?.clientText).to.equal(clientText);
      expect(handle.doc(Context.default())?.foreignPeerText).to.equal(foreignPeerText);
    }
  });
});

const setup = async (kv = createTestLevel()) => {
  await openAndClose(kv);
  const host = new AutomergeHost({
    db: kv,
  });
  await openAndClose(host);
  return { kv, host };
};
