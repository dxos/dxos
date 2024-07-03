//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { AutomergeHost, DataServiceImpl } from '@dxos/echo-pipeline';
import { IndexMetadataStore } from '@dxos/indexing';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test';

import { RepoClient } from '../../../dist/lib/browser/chunk-SASG55ZD.mjs';

describe.only('RepoClient', () => {
  test('create document from client', async () => {
    const { host, clientRepo } = await setup();

    const clientHandle = clientRepo.create();
    const hostHandle = host._repo!.find<{ text: string }>(clientHandle.url);
    const text = 'Hello World!';
    clientHandle.change((doc: any) => {
      doc.text = text;
    });

    await hostHandle.whenReady();
    expect(hostHandle.docSync()?.text).to.equal(text);
  });
});

const setup = async (kv = createTestLevel()) => {
  await openAndClose(kv);
  const host = new AutomergeHost({
    db: kv.sublevel('automerge'),
    indexMetadataStore: new IndexMetadataStore({ db: kv.sublevel('index-metadata') }),
  });
  await openAndClose(host);

  const dataService = new DataServiceImpl(host);
  const clientRepo = new RepoClient(dataService);
  return { kv, host, dataService, clientRepo };
};
