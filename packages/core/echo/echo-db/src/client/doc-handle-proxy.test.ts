//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { generateAutomergeUrl, parseAutomergeUrl, Repo } from '@dxos/automerge/automerge-repo';
import { DocumentsSynchronizer } from '@dxos/echo-pipeline';
import { describe, openAndClose, test } from '@dxos/test';

import { DocHandleProxy } from './doc-handle-proxy';

describe('DocHandleProxy', () => {
  test('get update from handle', async () => {
    const text = 'Hello World!';
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const clientHandle = new DocHandleProxy<{ text: string }>(documentId);
    clientHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    const workerRepo = new Repo({ network: [] });
    const docsSynchronizer = new DocumentsSynchronizer({ repo: workerRepo, sendUpdates: () => {} });
    await openAndClose(docsSynchronizer);

    const mutation = clientHandle._getPendingChanges()!;
    docsSynchronizer.update([{ documentId, mutation, isNew: true }]);
    const workerHandle = workerRepo.find(documentId);
    expect(workerHandle.docSync()?.text).to.equal(text);
  });

  test('update handle with foreign mutation', async () => {
    const text = 'Hello World!';

    const workerRepo = new Repo({ network: [] });
    const workerHandle = workerRepo.create<{ text: string }>();

    const clientHandle = new DocHandleProxy<{ text: string }>(workerHandle.documentId);

    const docsSynchronizer = new DocumentsSynchronizer({
      repo: workerRepo,
      sendUpdates: ({ updates }) => {
        updates?.forEach((update) => clientHandle._integrateHostUpdate(update.mutation));
      },
    });
    await openAndClose(docsSynchronizer);
    await docsSynchronizer.addDocuments([workerHandle.documentId]);
    workerHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    expect(clientHandle.docSync().text).to.equal;
  });

  test('foreign and intrinsic mutation', async () => {
    const clientText = 'Hello World from client!';
    const foreignPeerText = 'Hello World from foreign peer!';
    type DocType = { clientText: string; foreignPeerText: string };

    const workerRepo = new Repo({ network: [] });
    const workerHandle = workerRepo.create();
    const synchronizer = new DocumentsSynchronizer({
      repo: workerRepo,
      sendUpdates: ({ updates }) => updates?.forEach((update) => clientHandle._integrateHostUpdate(update.mutation)),
    });
    await openAndClose(synchronizer);
    workerHandle.change((doc: DocType) => {
      doc.foreignPeerText = foreignPeerText;
    });

    const clientHandle = new DocHandleProxy<DocType>(workerHandle.documentId);
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
    synchronizer.update([{ documentId: workerHandle.documentId, mutation: clientUpdate }]);

    for (const handle of [clientHandle, workerHandle]) {
      expect(handle.docSync()?.clientText).to.equal(clientText);
      expect(handle.docSync()?.foreignPeerText).to.equal(foreignPeerText);
    }
  });
});
