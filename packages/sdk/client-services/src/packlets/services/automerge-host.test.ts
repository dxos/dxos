//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { AutomergeContext } from '@dxos/echo-db';
import { AutomergeHost, DataServiceImpl } from '@dxos/echo-pipeline';
import { createTestLevel } from '@dxos/echo-pipeline/testing';
import { afterTest, describe, test } from '@dxos/test';

describe('AutomergeHost', () => {
  test('automerge context is being synced with host', async () => {
    //
    // Setup:
    // client-services           | <-------------> | client
    // AutomergeHost             | DataServiceImpl | AutomergeContext
    // creates repo and document | replicates repo | finds document in repo
    //

    const level = createTestLevel();
    await level.open();
    afterTest(() => level.close());

    const host = new AutomergeHost({
      db: level.sublevel('automerge'),
    });
    await host.open();
    afterTest(() => host.close());

    const dataService = new DataServiceImpl(host);
    const client = new AutomergeContext(dataService);
    afterTest(() => client.close());

    // Create document in repo.
    const handle = host.repo.create();
    const text = 'Hello World!';
    handle.change((doc: any) => {
      doc.text = text;
    });

    // Find document in repo.
    const doc = client.repo.find(handle.url);
    await asyncTimeout(doc.whenReady(), 1_000);
    expect(doc.docSync().text).to.equal(text);

    // Changes from client are replicated to host.
    const newText = 'Goodbye World!!!';
    doc.change((doc: any) => {
      doc.text = newText;
    });
    await client.flush({ states: [{ documentId: doc.documentId, heads: getHeads(doc.docSync()) }] });

    await asyncTimeout(handle.whenReady(), 1_000);
    expect(handle.docSync().text).to.equal(newText);
  });
});
