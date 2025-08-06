//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AutomergeUrl } from '@automerge/automerge-repo';
import { describe, expect, test } from 'vitest';

import { Trigger, asyncTimeout, latch, sleep } from '@dxos/async';
import { AutomergeHost, DataServiceImpl, FIND_PARAMS, SpaceStateManager } from '@dxos/echo-pipeline';
import { TestReplicationNetwork } from '@dxos/echo-pipeline/testing';
import { IndexMetadataStore } from '@dxos/indexing';
import { PublicKey, SpaceId } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { type DocHandleProxy } from './doc-handle-proxy';
import { RepoProxy } from './repo-proxy';

describe('RepoProxy', () => {
  test('create document from client', async () => {
    const { dataService, host } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const clientHandle = clientRepo.create<{ text: string }>();
    const hostHandle = await host.repo!.find<{ text: string }>(clientHandle.url, FIND_PARAMS);
    await hostHandle.whenReady();

    const receivedChange = new Trigger();
    hostHandle.once('change', () => receivedChange.wake());
    const text = 'Hello World!';
    clientHandle.change((doc: any) => {
      doc.text = text;
    });
    await receivedChange.wait();

    expect(hostHandle.doc()?.text).to.equal(text);

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
    const hostHandle = host.repo!.create<{ text: string }>({ text });
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

    const handle2 = repo2.find<{ text: string }>(handle1.url);
    await handle2.whenReady();
    expect(handle2.doc()?.text).to.equal(text);
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
      expect(handle1.doc().text).to.equal(text);
    }
  });

  test('load document from disk', async () => {
    const level = createTestLevel();

    let url: AutomergeUrl;
    {
      const { host, dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

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
      const { dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);
      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  test('new document persists without `flush`', async () => {
    const path = `/tmp/dxos-${PublicKey.random().toHex()}`;
    let url: AutomergeUrl;

    {
      const level = createTestLevel(path);
      const { host, dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';
      const clientHandle = clientRepo.create<{ text: string; mutation_text?: string }>({ text });
      url = clientHandle.url;
      await sleep(200); // Wait for the object to be saved.
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
    const path = `/tmp/dxos-${PublicKey.random().toHex()}`;
    let url: AutomergeUrl;

    {
      const level = createTestLevel(path);
      const { host, dataService } = await setup(level);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';
      const clientHandle = clientRepo.create<{ text?: string }>();
      clientHandle.change((doc) => (doc.text = text));
      url = clientHandle.url;
      await sleep(200); // Wait for the object to be saved.
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
    const hostHandle = await host.repo!.find<{ client: number; host: number }>(handle.url);

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

    const hostHandle = await host.repo!.find<{ text: string }>(cloneHandle.url, FIND_PARAMS);
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

    const hostHandles = await Promise.all(
      handles.map(async (handle) => host.repo!.find<{ text: string }>(handle.url, FIND_PARAMS)),
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

    // Create documents in repo2.s
    const handles2: DocHandleProxy<DocStruct>[] = [];
    for (let i = 0; i < amountToCreateInEachRepo; i++) {
      handles2.push(repo2.create<DocStruct>());
      handles2[i].change((doc: DocStruct) => {
        doc.text2 = text2;
      });
    }

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
  return { kv, host, dataService };
};

function* createProxyRepos(dataService: DataServiceImpl): Generator<RepoProxy> {
  for (let i = 0; i < 1_00; i++) {
    // Counter just to protect against infinite loops.
    yield new RepoProxy(dataService, SpaceId.random());
  }
  throw new Error('Too many repos requested');
}
