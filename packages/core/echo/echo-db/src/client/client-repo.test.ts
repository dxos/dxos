//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import waitForExpect from 'wait-for-expect';

import { Trigger, asyncTimeout, latch } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { type AutomergeUrl } from '@dxos/automerge/automerge-repo';
import { AutomergeHost, DataServiceImpl } from '@dxos/echo-pipeline';
import { IndexMetadataStore } from '@dxos/indexing';
import { createTestLevel } from '@dxos/kv-store/testing';
import { describe, test, openAndClose } from '@dxos/test';

import { ClientRepo } from '../client';
import { TestReplicationNetwork } from '../testing';

describe('ClientRepo', () => {
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

      await clientRepo.flush();
      await host.repo!.flush();
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

  test('import doc gets replicated', async () => {
    const { host, clientRepo } = await setup();

    const text = 'Hello World!';
    const handle = clientRepo.create<{ text: string }>({ text });

    const cloneHandle = clientRepo.import<{ text: string }>(A.save(handle.docSync()));
    await cloneHandle.whenReady();
    expect(cloneHandle.docSync()?.text).to.equal(text);

    const hostHandle = host.repo!.find<{ text: string }>(cloneHandle.url);

    await waitForExpect(() => {
      expect(hostHandle.docSync()?.text).to.equal(text);
    });
  });

  test('create N documents', async () => {
    const { host, clientRepo } = await setup();

    const numberOfDocuments = 100;
    const text = 'Hello World!';
    const handles = [];

    for (let i = 0; i < numberOfDocuments / 2; i++) {
      handles.push(clientRepo.create<{ text: string }>({ text }));
    }

    for (let i = 0; i < numberOfDocuments / 2; i++) {
      const handle = clientRepo.create<{ text: string }>();
      handle.change((doc: any) => {
        doc.text = text;
      });
      handles.push(handle);
    }

    for (const handle of handles) {
      expect(handle.docSync()).to.not.equal(text);
    }

    const hostHandles = handles.map((handle) => host.repo!.find<{ text: string }>(handle.url));
    await Promise.all(hostHandles.map((handle) => handle.whenReady()));

    await waitForExpect(async () => {
      for (const handle of hostHandles) {
        expect(handle.docSync()?.text).to.equal(text);
      }
    }, 1000);
  });

  test('multiple clients one worker repo', async () => {
    const { dataService, clientRepo: firstClient } = await setup();
    const secondClient = new ClientRepo(dataService);
    await openAndClose(secondClient);

    const text = 'Hello World!';
    const firstClientHandle = firstClient.create<{ text: string }>({ text });

    const secondClientHandle = secondClient.find<{ text: string }>(firstClientHandle.url);

    await secondClientHandle.whenReady();
    expect(secondClientHandle.docSync()?.text).to.equal(text);
  });
});

const setup = async (kv = createTestLevel()) => {
  await openAndClose(kv);
  const host = new AutomergeHost({
    db: kv,
    indexMetadataStore: new IndexMetadataStore({ db: kv.sublevel('index-metadata') }),
  });
  await openAndClose(host);

  const dataService = new DataServiceImpl(host);
  const clientRepo = new ClientRepo(dataService);
  await openAndClose(clientRepo);
  return { kv, host, dataService, clientRepo };
};
