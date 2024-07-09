//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { generateAutomergeUrl, parseAutomergeUrl, Repo } from '@dxos/automerge/automerge-repo';
import { DocSyncState } from '@dxos/echo-pipeline';
import { describe, test } from '@dxos/test';

import { ClientDocHandle } from './client-doc-handle';

describe('ClientDocHandle', () => {
  test('get update from handle', async () => {
    const text = 'Hello World!';
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const docHandle = new ClientDocHandle<{ text: string }>(documentId);
    docHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    const repoToSync = new Repo({ network: [] });
    const handleToSync = repoToSync.find<{ text: string }>(documentId);
    const syncState = new DocSyncState(handleToSync);

    const update = docHandle._getPendingChanges()!;
    syncState.write(update);
    expect(handleToSync.docSync()?.text).to.equal(text);
  });

  test('update handle with foreign mutation', async () => {
    const text = 'Hello World!';

    const repoToSync = new Repo({ network: [] });
    const handleToSync = repoToSync.create<{ text: string }>();
    const syncState = new DocSyncState(handleToSync);
    handleToSync.change((doc: { text: string }) => {
      doc.text = text;
    });

    const docHandle = new ClientDocHandle<{ text: string }>(handleToSync.documentId);
    const update = syncState.getNextMutation()!;
    docHandle._integrateHostUpdate(update);

    expect(docHandle.docSync().text).to.equal;
  });

  test('foreign and intrinsic mutation', async () => {
    const clientText = 'Hello World from client!';
    const foreignPeerText = 'Hello World from foreign peer!';
    type DocType = { clientText: string; foreignPeerText: string };

    const repoToSync = new Repo({ network: [] });
    const handleToSync = repoToSync.create();
    const syncState = new DocSyncState(handleToSync);
    handleToSync.change((doc: DocType) => {
      doc.foreignPeerText = foreignPeerText;
    });

    const docHandle = new ClientDocHandle<DocType>(handleToSync.documentId);
    docHandle.change((doc: DocType) => {
      doc.clientText = clientText;
    });

    // Send foreign mutation to client.
    const update = syncState.getNextMutation()!;
    docHandle._integrateHostUpdate(update);

    // Send client mutation to foreign peer.
    const clientUpdate = docHandle._getPendingChanges()!;
    syncState.write(clientUpdate);

    for (const handle of [docHandle, handleToSync]) {
      expect(handle.docSync()?.clientText).to.equal(clientText);
      expect(handle.docSync()?.foreignPeerText).to.equal(foreignPeerText);
    }
  });
});
