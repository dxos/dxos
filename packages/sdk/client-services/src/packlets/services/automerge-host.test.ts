//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { asyncTimeout, sleep } from '@dxos/async';
import { AutomergeHost, DataServiceImpl, type DataServiceSubscriptions } from '@dxos/echo-pipeline';
import { AutomergeContext } from '@dxos/echo-schema';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { describe, test } from '@dxos/test';

describe('AutomergeHost', () => {
  test('automerge context is being synced with host', async () => {
    //
    // Setup:
    // client-services           | <-------------> | client
    // AutomergeHost             | DataServiceImpl | AutomergeContext
    // creates repo and document | replicates repo | finds document in repo
    //

    const storageDirectory = createStorage({ type: StorageType.RAM }).createDirectory();

    const host = new AutomergeHost(storageDirectory);
    const dataService = new DataServiceImpl(
      {} as DataServiceSubscriptions, // is not used in this test, just required argument
      host,
    );
    const client = new AutomergeContext(dataService);

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

    await sleep(100);
    await asyncTimeout(handle.whenReady(), 1_000);
    expect(handle.docSync().text).to.equal(newText);
  });
});
