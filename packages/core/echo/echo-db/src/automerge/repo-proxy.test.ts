//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AutomergeUrl } from '@automerge/automerge-repo';
import * as Record from 'effect/Record';
import { describe, expect, test } from 'vitest';

import { Trigger, asyncTimeout, latch, sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { AutomergeHost, DataServiceImpl, SpaceStateManager } from '@dxos/echo-pipeline';
import { TestReplicationNetwork } from '@dxos/echo-pipeline/testing';
import { IndexMetadataStore } from '@dxos/indexing';
import { SpaceId } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { log } from '@dxos/log';
import { openAndClose } from '@dxos/test-utils';

import { createTmpPath } from '../testing';

import { type DocHandleProxy } from './doc-handle-proxy';
import { RepoProxy } from './repo-proxy';

describe('RepoProxy', () => {
  test('create document from client', async () => {
    const { dataService, host } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    log.break();
    const clientHandle = clientRepo.create<{ text: string }>();
    await clientHandle.whenReady();
    log.break();

    const hostHandle = await host.loadDoc<{ text: string }>(Context.default(), clientHandle.url);
    log.break();
    await hostHandle.whenReady();

    log.break();
    const receivedChange = new Trigger();
    hostHandle.once('change', () => receivedChange.wake());
    const text = 'Hello World!';
    clientHandle.change((doc: any) => {
      doc.text = text;
    });
    await receivedChange.wait();

    expect(hostHandle.doc()?.text).to.equal(text);

    log.break();

    {
      // Change from another peer.
      const receivedChange = new Trigger();
      clientHandle.once('change', () => receivedChange.wake());
      const text = 'Hello World 2!';
      hostHandle.change((doc: any) => {
        doc.text = text;
      });
      await receivedChange.wait();
      expect(clientHandle.doc()!.text).to.equal(text);
    }
  });

  test('load document from client', async () => {
    const { host, dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const text = 'Hello World!';
    const hostHandle = await host.createDoc<{ text: string }>({ text });
    const clientHandle = clientRepo.find<{ text: string }>(hostHandle.url);
    await asyncTimeout(clientHandle.whenReady(), 1000);
    expect(clientHandle.doc()?.text).to.equal(text);
  });

  test('two peers exchange document', async () => {
    const peer1 = await setup();
    const [repo1] = createProxyRepos(peer1.dataService);
    await openAndClose(repo1);

    const peer2 = await setup();
    const [repo2] = createProxyRepos(peer2.dataService);
    await openAndClose(repo2);
    const network = await new TestReplicationNetwork().open();

    await peer1.host.addReplicator(await network.createReplicator());
    await peer2.host.addReplicator(await network.createReplicator());

    const text = 'Hello World!';
    const handle1 = repo1.create<{ text: string }>({ text });
    await handle1.whenReady();
    await repo1.flush();

    const handle2 = repo2.find<{ text: string }>(handle1.url);
    await handle2.whenReady();
    expect(handle2.doc()?.text).to.equal(text);
    await peer1.host.flush();

    {
      // Change from another peer.
      const receivedChange = new Trigger();
      handle1.once('change', () => receivedChange.wake());
      const text = 'Hello World 2!';
      handle2.change((doc: any) => {
        doc.text = text;
      });
      await receivedChange.wait();
      expect(handle1.doc().text).to.equal(text);
    }
  });

  test('load document from disk', async () => {
    const tmpPath = createTmpPath();

    let url: AutomergeUrl;
    {
      const level = createTestLevel(tmpPath);
      await openAndClose(level);
      const { host, dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';

      const clientHandle = clientRepo.create<{ text: string }>();
      await clientHandle.whenReady();
      url = clientHandle.url;
      clientHandle.change((doc: any) => {
        doc.text = text;
      });

      await clientRepo.flush();
      await host.flush();
      await clientRepo.close();
      await host.close();
      await level.close();
    }

    {
      const level = createTestLevel(tmpPath);
      await openAndClose(level);
      const { dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);
      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  test('new document persists without `flush`', async () => {
    const path = createTmpPath();
    let url: AutomergeUrl;

    {
      const level = createTestLevel(path);
      const { host, dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';
      const clientHandle = clientRepo.create<{ text: string }>({ text });
      await clientHandle.whenReady();
      url = clientHandle.url;
      await sleep(1000); // Wait for the object to be saved without flush.
      await level.close();
      await host.close();
      await clientRepo.close();
    }

    {
      const level = createTestLevel(path);
      const { dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);

      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  test('document mutation persists without `flush`', async () => {
    const path = createTmpPath();
    let url: AutomergeUrl;

    {
      const level = createTestLevel(path);
      const { host, dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';
      type TestDoc = { text: string };
      const clientHandle = clientRepo.create<TestDoc>();
      await clientRepo.flush();
      clientHandle.change((doc: TestDoc) => (doc.text = text));
      url = clientHandle.url;
      await sleep(500); // Wait for the object to be saved without flush.
      await level.close();
      await host.close();
      await clientRepo.close();
    }

    {
      const level = createTestLevel(path);
      const { dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);

      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  test('client and host make changes simultaneously', async () => {
    const { host, dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const handle = clientRepo.create<{ client: number; host: number }>();
    await handle.whenReady();
    const hostHandle = await host.loadDoc<{ client: number; host: number }>(Context.default(), handle.url);

    const numberOfUpdates = 1000;
    for (let i = 1; i <= numberOfUpdates; i++) {
      handle.change((doc: any) => {
        doc.client = i;
      });

      hostHandle.change((doc: any) => {
        doc.host = i;
      });
    }

    expect(handle.doc()?.host).to.equal(undefined);
    expect(hostHandle.doc()?.client).to.equal(undefined);

    const [receiveChanges, inc] = latch({ count: 2, timeout: 1000 });
    handle.once('change', inc);
    hostHandle.once('change', inc);

    await receiveChanges();
    await handle.whenReady();
    expect(handle.doc()?.host).to.equal(numberOfUpdates);
    await hostHandle.whenReady();
    expect(handle.doc()?.client).to.equal(numberOfUpdates);
  });

  test('import doc gets replicated', async () => {
    const { host, dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const text = 'Hello World!';
    const handle = clientRepo.create<{ text: string }>({ text });

    const cloneHandle = clientRepo.import<{ text: string }>(A.save(handle.doc()));
    await cloneHandle.whenReady();
    expect(cloneHandle.doc()?.text).to.equal(text);

    const hostHandle = await host.loadDoc<{ text: string }>(Context.default(), cloneHandle.url);
    await hostHandle.whenReady();
    await expect.poll(() => hostHandle.doc()?.text).toEqual(text);
  });

  test('create N documents', async () => {
    const { host, dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const numberOfDocuments = 5;
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
      expect(handle.doc()).to.not.equal(text);
    }

    // Wait for all handles to be ready before accessing their URLs.
    await Promise.all(handles.map((handle) => handle.whenReady()));

    const hostHandles = await Promise.all(
      handles.map(async (handle) => host.loadDoc<{ text: string }>(Context.default(), handle.url)),
    );

    for (const handle of hostHandles) {
      await handle.whenReady();
      await expect.poll(() => handle.doc()?.text, { timeout: 1000 }).toEqual(text);
    }
  });

  test('multiple clients one worker repo', async () => {
    const { dataService } = await setup();
    const [repo1, repo2] = createProxyRepos(dataService);
    await openAndClose(repo1, repo2);

    const amountToCreateInEachRepo = 10;
    const text1 = 'Hello World from client1!';
    const text2 = 'Hello World from client2!';
    type DocStruct = { text1?: string; text2?: string };

    // Create documents in repo1.
    const handles1: DocHandleProxy<DocStruct>[] = [];
    for (let i = 0; i < amountToCreateInEachRepo; i++) {
      handles1.push(repo1.create<DocStruct>());
      handles1[i].change((doc: DocStruct) => {
        doc.text1 = text1;
      });
    }
    await Promise.all(handles1.map((h) => h.whenReady()));

    // Create documents in repo2.
    const handles2: DocHandleProxy<DocStruct>[] = [];
    for (let i = 0; i < amountToCreateInEachRepo; i++) {
      handles2.push(repo2.create<DocStruct>());
      handles2[i].change((doc: DocStruct) => {
        doc.text2 = text2;
      });
    }
    await Promise.all(handles2.map((h) => h.whenReady()));

    // Replicate documents from repo1 to repo2.
    for (const handle of handles1) {
      const foundHandle = repo2.find<DocStruct>(handle.url);
      await foundHandle.whenReady();
      foundHandle.change((doc: DocStruct) => {
        doc.text2 = text2;
      });
      handles2.push(repo2.find<DocStruct>(handle.url));
    }

    // Replicate documents from repo2 to repo1.
    for (const handle of handles2) {
      const foundHandle = repo1.find<DocStruct>(handle.url);
      await foundHandle.whenReady();
      foundHandle.change((doc: DocStruct) => {
        doc.text1 = text1;
      });
      handles1.push(repo1.find<DocStruct>(handle.url));
    }

    // Check that all documents are replicated.
    for (const handle of [...handles1, ...handles2]) {
      await handle.whenReady();
      await expect.poll(async () => handle.doc()?.text1, { timeout: 1000 }).toEqual(text1);
      await expect.poll(async () => handle.doc()?.text2, { timeout: 1000 }).toEqual(text2);
    }
  });
});

const setup = async (kv = createTestLevel()) => {
  await openAndClose(kv);
  const host = new AutomergeHost({
    db: kv,
    indexMetadataStore: new IndexMetadataStore({ db: kv.sublevel('index-metadata') }),
  });
  await openAndClose(host);

  const dataService = new DataServiceImpl({
    automergeHost: host,
    spaceStateManager: new SpaceStateManager(),
    updateIndexes: async () => {},
  });

  const refreshCollectionState = async () => {
    const documentIds = Record.keys(host.handles);
    log('refreshCollectionState', { documentIds });
    await host.updateLocalCollectionState('default', documentIds);
  };
  return { kv, host, dataService, refreshCollectionState };
};

function* createProxyRepos(dataService: DataServiceImpl): Generator<RepoProxy> {
  for (let i = 0; i < 1_00; i++) {
    // Counter just to protect against infinite loops.
    yield new RepoProxy(dataService, SpaceId.random());
  }
  throw new Error('Too many repos requested');
}
