//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { AutomergeHost, DataServiceImpl } from '@dxos/echo-pipeline';
import { IndexMetadataStore } from '@dxos/indexing';
import { createTestLevel } from '@dxos/kv-store/testing';
import { describe, test, openAndClose } from '@dxos/test';

import { RepoClient } from '../repo';
import { TestReplicationNetwork } from '../testing';

describe('RepoClient', () => {
  test('create document from client', async () => {
    const { host, clientRepo } = await setup();

    const clientHandle = clientRepo.create<{ text: string }>();
    const hostHandle = host.repo!.find<{ text: string }>(clientHandle.url);
    const text = 'Hello World!';
    clientHandle.change((doc: any) => {
      doc.text = text;
    });

    await hostHandle.whenReady();
    expect(hostHandle.docSync()?.text).to.equal(text);

    {
      // Change from another peer.
      const receivedChange = new Trigger();
      clientHandle.once('change', () => receivedChange.wake());
      const text = 'Hello World 2!';
      hostHandle.change((doc: any) => {
        doc.text = text;
      });
      await receivedChange.wait();
      expect(clientHandle.docSync().text).to.equal(text);
    }
  });

  test('load document from client', async () => {
    const { host, clientRepo } = await setup();

    const text = 'Hello World!';
    const hostHandle = host.repo!.create<{ text: string }>({ text });
    const clientHandle = clientRepo.find<{ text: string }>(hostHandle.url);
    await clientHandle.whenReady();

    expect(clientHandle.docSync()?.text).to.equal(text);
  });

  test('two peers exchange document', async () => {
    const peer1 = await setup();
    const peer2 = await setup();
    const network = await new TestReplicationNetwork().open();

    await peer1.host.addReplicator(await network.createReplicator());
    await peer2.host.addReplicator(await network.createReplicator());

    const text = 'Hello World!';
    const handle1 = peer1.clientRepo.create<{ text: string }>();
    const handle2 = peer2.clientRepo.find<{ text: string }>(handle1.url);

    handle1.change((doc: any) => {
      doc.text = text;
    });

    await handle2.whenReady();
    expect(handle2.docSync()?.text).to.equal(text);

    {
      // Change from another peer.
      const receivedChange = new Trigger();
      handle1.once('change', () => receivedChange.wake());
      const text = 'Hello World 2!';
      handle2.change((doc: any) => {
        doc.text = text;
      });
      await receivedChange.wait();
      expect(handle1.docSync().text).to.equal(text);
    }
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
  await openAndClose(clientRepo);
  return { kv, host, dataService, clientRepo };
};
