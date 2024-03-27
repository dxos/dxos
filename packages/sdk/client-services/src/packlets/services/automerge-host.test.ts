//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout, sleep } from '@dxos/async';
import { AutomergeHost, DataServiceImpl } from '@dxos/echo-pipeline';
import { AutomergeContext } from '@dxos/echo-schema';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { afterTest, describe, test } from '@dxos/test';

describe('AutomergeHost', () => {
  test('automerge context is being synced with host', async () => {
    //
    // Setup:
    // client-services           | <-------------> | client
    // AutomergeHost             | DataServiceImpl | AutomergeContext
    // creates repo and document | replicates repo | finds document in repo
    //

    const storageDirectory = createStorage({ type: StorageType.RAM }).createDirectory();

    const host = new AutomergeHost({ directory: storageDirectory });
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

    // TODO(mykola): Is there a way to know when automerge has started replication?
    await sleep(100);
    await asyncTimeout(handle.whenReady(), 1_000);
    expect(handle.docSync().text).to.equal(newText);
  });
});
