//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout, latch } from '@dxos/async';
import { getHeads } from '@dxos/automerge/automerge';
import { type AutomergeUrl } from '@dxos/automerge/automerge-repo';
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

    const receivedChange = new Trigger();
    hostHandle.once('change', () => receivedChange.wake());
    await receivedChange.wait();
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
    await asyncTimeout(clientHandle.whenReady(), 1000);

    expect(clientHandle.docSync()?.text).to.equal(text);
  });

  test('two peers exchange document', async () => {
    const peer1 = await setup();
    const peer2 = await setup();
    const network = await new TestReplicationNetwork().open();

    await peer1.host.addReplicator(await network.createReplicator());
    await peer2.host.addReplicator(await network.createReplicator());

    const text = 'Hello World!';
    const handle1 = peer1.clientRepo.create<{ text: string }>({ text });

    const handle2 = peer2.clientRepo.find<{ text: string }>(handle1.url);
    await handle2.doc();
    expect(handle2.docSync()?.text).to.equal(text);
    await peer1.host.repo.flush();

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

  test('load document from disk', async () => {
    const level = createTestLevel();

    let url: AutomergeUrl;
    {
      const { host, clientRepo } = await setup(level);

      const text = 'Hello World!';

      const clientHandle = clientRepo.create<{ text: string }>();
      url = clientHandle.url;
      clientHandle.change((doc: any) => {
        doc.text = text;
      });

      await host.flush({ states: [{ documentId: clientHandle.documentId, heads: getHeads(clientHandle.docSync()) }] });
      await host.close();
      await clientRepo.close();
    }

    {
      const { clientRepo } = await setup(level);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);

      expect(clientHandle.docSync()?.text).to.equal('Hello World!');
    }
  });

  test('client and host make changes simultaneously', async () => {
    const { host, clientRepo } = await setup();

    const handle = clientRepo.create<{ client: number; host: number }>();
    const hostHandle = host.repo!.find<{ client: number; host: number }>(handle.url);
    await hostHandle.whenReady();

    const numberOfUpdates = 1000;
    for (let i = 1; i <= numberOfUpdates; i++) {
      handle.change((doc: any) => {
        doc.client = i;
      });

      hostHandle.change((doc: any) => {
        doc.host = i;
      });
    }

    expect(handle.docSync()?.host).to.equal(undefined);
    expect(hostHandle.docSync()?.client).to.equal(undefined);

    const [receiveChanges, inc] = latch({ count: 2, timeout: 1000 });
    handle.once('change', inc);
    hostHandle.once('change', inc);

    await receiveChanges();
    await handle.whenReady();
    expect(handle.docSync()?.host).to.equal(numberOfUpdates);
    await hostHandle.whenReady();
    expect(handle.docSync()?.client).to.equal(numberOfUpdates);
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
