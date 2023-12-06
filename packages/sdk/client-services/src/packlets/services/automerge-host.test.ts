//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, sleep } from '@dxos/async';
import { AutomergeHost, DataServiceImpl, type DataServiceSubscriptions } from '@dxos/echo-pipeline';
import { AutomergeContext } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { describe, test } from '@dxos/test';

describe.only('AutomergeHost', () => {
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
    await asyncTimeout(handle.whenReady(), 3_000);
    handle.change((doc: any) => {
      doc.text = 'Hello World!';
    });

    await sleep(1000);

    // Find document in repo.
    const doc = client.repo.find(handle.url);
    log.info('doc', { doc: doc.url, ready: doc.state });

    await asyncTimeout(doc.whenReady(), 3_000);
  });
});
