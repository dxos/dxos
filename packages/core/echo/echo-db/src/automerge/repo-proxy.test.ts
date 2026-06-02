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
import { TestReplicationNetwork, createTestSqliteRuntime } from '@dxos/echo-pipeline/testing';
import { invariant } from '@dxos/invariant';
import { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { openAndClose } from '@dxos/test-utils';

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

    const hostHandle = await host.loadDoc<{ text: string }>(Context.default(), clientHandle.url!);
    invariant(hostHandle);
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

    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    const text = 'Hello World!';
    const handle1 = repo1.create<{ text: string }>({ text });
    await handle1.whenReady();
    await repo1.flush();

    const handle2 = repo2.find<{ text: string }>(handle1.url!);
    await handle2.whenReady();
    expect(handle2.doc()?.text).to.equal(text);
    await peer1.host.flush(Context.default());

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
    const dbPath = `/tmp/repo-proxy-test-${Date.now()}.db`;

    let url: AutomergeUrl;
    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      const { host, dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';

      const clientHandle = clientRepo.create<{ text: string }>();
      await clientHandle.whenReady();
      url = clientHandle.url!;
      clientHandle.change((doc: any) => {
        doc.text = text;
      });

      await clientRepo.flush();
      await host.flush(Context.default());
      await clientRepo.close();
      await host.close();
      await dispose();
    }

    {
      const { runtime } = createTestSqliteRuntime(dbPath);
      const { dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);
      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  // Asserts the `pending → requesting → ready` state machine: when a doc is
  // not on disk and is not reachable via the network, the worker-side disk
  // probe still settles and notifies the client, transitioning the handle
  // from `pending` to `requesting`. `whenReady()` continues to wait
  // (no source ever delivers), but `whenSettledOnDisk()` resolves with
  // `false` so disk-only callers can give up without relying on timeouts.
  test('handle transitions to requesting when document is not on disk and not replicated', async () => {
    // Mint a real, valid documentId on a fully isolated host. This host is
    // never connected to the test peer's network, so the document is
    // unreachable from the test peer.
    const sourcePeer = await setup();
    const sourceHandle = await sourcePeer.host.createDoc<{ text: string }>({ text: 'unreachable' });
    const unreachableUrl = sourceHandle.url;

    // Test peer: separate kv store (no chunks for `unreachableUrl` on disk),
    // no replication network configured.
    const { dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const handle = clientRepo.find<{ text: string }>(unreachableUrl);
    expect(handle.state).toEqual('pending');
    expect(handle.isReady()).toBe(false);

    // The worker-side disk probe settles negative; the handle should report
    // `requesting` once the synchronizer flushes the transition update.
    const settledOnDisk = await asyncTimeout(handle.whenSettledOnDisk(), 1000);
    expect(settledOnDisk).toBe(false);
    expect(handle.state).toEqual('requesting');
    expect(handle.isReady()).toBe(false);

    // `whenReady()` must NOT resolve — there is no source for the doc on
    // disk or on the network.
    let readyResolved = false;
    void handle.whenReady().then(() => {
      readyResolved = true;
    });
    await sleep(300);

    expect(readyResolved).toBe(false);
    expect(handle.state).toEqual('requesting');
    expect(handle.isReady()).toBe(false);
  });

  // Sanity check for the `'ready'` arm of the state machine: when the doc
  // IS on local disk (i.e. created on the same worker), the handle settles
  // straight to `'ready'` and `whenSettledOnDisk()` resolves with `true`.
  test('handle settles to ready directly when document is on disk', async () => {
    const { host, dataService } = await setup();
    const sourceHandle = await host.createDoc<{ text: string }>({ text: 'on-disk' });

    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const handle = clientRepo.find<{ text: string }>(sourceHandle.url);
    const settledOnDisk = await asyncTimeout(handle.whenSettledOnDisk(), 1000);
    expect(settledOnDisk).toBe(true);
    await asyncTimeout(handle.whenReady(), 1000);
    expect(handle.state).toEqual('ready');
    expect(handle.doc()?.text).toEqual('on-disk');
  });

  test('new document persists without `flush`', async () => {
    const dbPath = `/tmp/repo-proxy-test-${Date.now()}.db`;
    let url: AutomergeUrl;

    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      const { host, dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';
      const clientHandle = clientRepo.create<{ text: string }>({ text: text });
      await sleep(200); // Wait for the object to be saved without flush.
      url = clientHandle.url!;
      await host.close();
      await clientRepo.close();
      await dispose();
    }

    {
      const { runtime } = createTestSqliteRuntime(dbPath);
      const { dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);

      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  test('document mutation persists with `flush`', async () => {
    const dbPath = `/tmp/repo-proxy-test-${Date.now()}.db`;
    let url: AutomergeUrl;

    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      const { host, dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';
      type TestDoc = { text: string };
      const clientHandle = clientRepo.create<TestDoc>();
      await clientRepo.flush();
      clientHandle.change((doc: TestDoc) => (doc.text = text));
      url = clientHandle.url!;
      await sleep(200); // Wait for the object to be saved without flush.
      await host.close();
      await clientRepo.close();
      await dispose();
    }

    {
      const { runtime } = createTestSqliteRuntime(dbPath);
      const { dataService } = await setup(runtime);
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
    const hostHandle = await host.loadDoc<{ client: number; host: number }>(Context.default(), handle.url!);
    invariant(hostHandle);

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

    const hostHandle = await host.loadDoc<{ text: string }>(Context.default(), cloneHandle.url!);
    invariant(hostHandle);
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
      handles.map(async (handle) => {
        const loaded = await host.loadDoc<{ text: string }>(Context.default(), handle.url!);
        invariant(loaded);
        return loaded;
      }),
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
      const foundHandle = repo2.find<DocStruct>(handle.url!);
      await foundHandle.whenReady();
      foundHandle.change((doc: DocStruct) => {
        doc.text2 = text2;
      });
      handles2.push(repo2.find<DocStruct>(handle.url!));
    }

    // Replicate documents from repo2 to repo1.
    for (const handle of handles2) {
      const foundHandle = repo1.find<DocStruct>(handle.url!);
      await foundHandle.whenReady();
      foundHandle.change((doc: DocStruct) => {
        doc.text1 = text1;
      });
      handles1.push(repo1.find<DocStruct>(handle.url!));
    }

    // Check that all documents are replicated.
    for (const handle of [...handles1, ...handles2]) {
      await handle.whenReady();
      await expect.poll(async () => handle.doc()?.text1, { timeout: 1000 }).toEqual(text1);
      await expect.poll(async () => handle.doc()?.text2, { timeout: 1000 }).toEqual(text2);
    }
  });
});

const setup = async (runtime = createTestSqliteRuntime().runtime) => {
  const host = new AutomergeHost({ runtime });
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
  return { host, dataService, refreshCollectionState };
};

function* createProxyRepos(dataService: DataServiceImpl): Generator<RepoProxy> {
  for (let i = 0; i < 1_00; i++) {
    // Counter just to protect against infinite loops.
    yield new RepoProxy(dataService, SpaceId.random());
  }
  throw new Error('Too many repos requested');
}
