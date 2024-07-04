//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { generateAutomergeUrl, parseAutomergeUrl, Repo } from '@dxos/automerge/automerge-repo';
import { DocSyncState } from '@dxos/echo-pipeline';
import { describe, test } from '@dxos/test';

import { DocHandleClient } from './doc-handle';

describe('DocHandleClient', () => {
  test('get update from handle', async () => {
    const text = 'Hello World!';
    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const docHandle = new DocHandleClient<{ text: string }>(documentId);
    docHandle.change((doc: { text: string }) => {
      doc.text = text;
    });

    const repoToSync = new Repo({ network: [] });
    const handleToSync = repoToSync.find(documentId);
    const syncState = new DocSyncState(handleToSync);

    const update = docHandle._getLastWriteMutation()!;
    syncState.write(update);
    expect(handleToSync.docSync().text).to.equal(text);
  });

  test('update handle with foreign mutation', async () => {
    const text = 'Hello World!';

    const repoToSync = new Repo({ network: [] });
    const handleToSync = repoToSync.create<{ text: string }>();
    const syncState = new DocSyncState(handleToSync);
    handleToSync.change((doc: { text: string }) => {
      doc.text = text;
    });

    const docHandle = new DocHandleClient<{ text: string }>(handleToSync.documentId);
    const update = syncState.getNextMutation()!;
    docHandle._incrementalUpdate(update);

    expect(docHandle.docSync().text).to.equal;
  });

  test('foreign and intrinsic mutation', async () => {
    const clientText = 'Hello World from client!';
    const foreignPeerText = 'Hello World from foreign peer!';
    type DocType = { clientText: string; foreignPeerText: string };

    const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
    const docHandle = new DocHandleClient<DocType>(documentId);
    docHandle.change((doc: DocType) => {
      doc.clientText = clientText;
    });

    const repoToSync = new Repo({ network: [] });
    const handleToSync = repoToSync.find(documentId);
    handleToSync.update((doc) => A.emptyChange(doc));
    const syncState = new DocSyncState(handleToSync);
    handleToSync.change((doc: DocType) => {
      doc.foreignPeerText = foreignPeerText;
    });

    // Send foreign mutation to client.
    const update = syncState.getNextMutation()!;
    docHandle._incrementalUpdate(update);

    // Send client mutation to foreign peer.
    const clientUpdate = docHandle._getLastWriteMutation()!;
    syncState.write(clientUpdate);

    for (const handle of [docHandle, handleToSync]) {
      expect(handle.docSync().clientText).to.equal(clientText);
      expect(handle.docSync().foreignPeerText).to.equal(foreignPeerText);
    }
  });
});
