//
// Copyright 2024 DXOS.org
//

import { generateAutomergeUrl, parseAutomergeUrl } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { AutomergeHost, DocumentsSynchronizer } from '@dxos/echo-pipeline';
import { IndexMetadataStore } from '@dxos/indexing';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { DocHandleProxy } from './doc-handle-proxy';

describe('DocHandleProxy', () => {
  test('get update from handle', async () => {
    const text = 'Hello World!';
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const clientHandle = new DocHandleProxy<{ text: string }>({ documentId, onDelete: () => {} });
    clientHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    const { host } = await setup();
    const docsSynchronizer = new DocumentsSynchronizer({ automergeHost: host, sendUpdates: () => {} });
    await openAndClose(docsSynchronizer);

    const mutation = clientHandle._getPendingChanges()!;
    await docsSynchronizer.update([{ documentId, mutation }]);
    const workerHandle = await host.loadDoc<{ text: string }>(Context.default(), documentId);
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
    await synchronizer.update([{ documentId: workerHandle.documentId, mutation: clientUpdate }]);

    for (const handle of [clientHandle, workerHandle] as const) {
      expect(handle.doc()?.clientText).to.equal(clientText);
      expect(handle.doc()?.foreignPeerText).to.equal(foreignPeerText);
    }
  });
});

const setup = async (kv = createTestLevel()) => {
  await openAndClose(kv);
  const host = new AutomergeHost({
    db: kv,
    indexMetadataStore: new IndexMetadataStore({ db: kv.sublevel('index-metadata') }),
  });
  await openAndClose(host);
  return { kv, host };
};
