//
// Copyright 2024 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type AutomergeUrl, generateAutomergeUrl } from '@automerge/automerge-repo';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as EffectStream from 'effect/Stream';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, latch, sleep, waitForCondition, yieldToEventLoop } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  AutomergeHost,
  DataServiceImpl,
  type DataServiceProps,
  IndexStatusTracker,
  SpaceStateManager,
} from '@dxos/echo-host';
import { TestReplicationNetwork, createTestSqliteRuntime } from '@dxos/echo-host/testing';
import { type DatabaseDirectory, EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import { DXN, EntityId, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { makeInProcessClient } from '@dxos/protocols';
import { DataService } from '@dxos/protocols/rpc';
import { openAndClose } from '@dxos/test-utils';

import { CLOSE_REASON_ATTRIBUTE, DocumentUnavailableError, EchoClientError, RepoClosedError } from '../errors.ts';
import { createTmpPath } from '../testing/index.ts';
import { type DocHandleProxy } from './doc-handle-proxy.ts';
import { RepoProxy, type SaveStateChangedEvent } from './repo-proxy.ts';

/** True once the handle's current heads have been written to the host's on-disk heads store. */
const documentHeadsPersisted = async <T>(host: AutomergeHost, handle: DocHandleProxy<T>): Promise<boolean> => {
  const doc = handle.doc();
  if (!doc || !handle.documentId) {
    return false;
  }
  const currentHeads = A.getHeads(doc);
  for await (const { documentId, heads } of host.listDocumentHeads()) {
    if (documentId === handle.documentId && A.equals(heads, currentHeads)) {
      return true;
    }
  }
  return false;
};

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
    await hostHandle.waitUntilReady();

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

  test('a passive handle loads the bytes it holds on first use and catches up from their heads', async () => {
    const { host, dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const hostHandle = await host.createDoc<{ text: string; extra?: number }>({ text: 'held' });
    const bytes = A.save(hostHandle.doc()!);
    const heads = A.getHeads(hostHandle.doc()!);
    hostHandle.change((doc) => {
      doc.text = 'after';
    });
    await host.flush(Context.default());

    const handle = clientRepo.find<{ text: string; extra?: number }>(hostHandle.documentId, {
      passive: { bytes, heads },
    });
    expect(handle.state).toBe('passive');
    expect(clientRepo.handles[hostHandle.documentId]).toBeUndefined();

    expect(handle.doc().text).toBe('held');
    expect(handle.isLoaded()).toBe(true);
    expect(clientRepo.handles[hostHandle.documentId]).toBe(handle);
    await asyncTimeout(handle.whenReady(), 1_000);
    expect(handle.doc().text).toBe('after');

    handle.change((doc: { text: string; extra?: number }) => {
      doc.extra = 1;
    });
    await clientRepo.flush();
    await waitForCondition({ condition: () => hostHandle.doc()?.extra === 1, timeout: 1_000 });
  });

  test("a passive handle takes a host change with its object's JSON, and keeps it with its stored changes", async () => {
    const { host, clientRepo, service } = await setupRecording();
    const { hostHandle, objectId, bytes, heads } = await createDirectory(host, 'shown');

    const handle = clientRepo.find<DatabaseDirectory>(hostHandle.documentId, { passive: { bytes, heads } });
    const shown: string[] = [];
    handle.on('passive', ({ json }) => json && shown.push(JSON.parse(json).title));
    await expect
      .poll(() => service.requests.flatMap(({ add }) => add ?? []))
      .toContainEqual({ id: hostHandle.documentId, heads, passive: true });

    hostHandle.change((doc) => {
      doc.objects![objectId].data.title = 'edited';
    });
    await host.flush(Context.default());
    await expect.poll(() => shown).toEqual(['edited']);
    expect(handle.state).toBe('passive');
    expect(handle.passiveHeads).toEqual(A.getHeads(hostHandle.doc()!));
    expect(handle.doc().objects![objectId].data.title).toBe('edited');
  });

  test("find with other heads replaces a passive handle's stored changes", async () => {
    const { host, clientRepo } = await setupRecording();
    const { hostHandle, objectId, bytes, heads } = await createDirectory(host, 'shown');
    const handle = clientRepo.find<DatabaseDirectory>(hostHandle.documentId, { passive: { bytes, heads } });
    hostHandle.change((doc) => {
      doc.objects![objectId].data.title = 'edited';
    });

    const edited = { bytes: A.save(hostHandle.doc()!), heads: A.getHeads(hostHandle.doc()!) };
    expect(clientRepo.find(hostHandle.documentId, { passive: edited })).toBe(handle);
    expect(handle.passiveHeads).toEqual(edited.heads);
    expect(handle.doc().objects![objectId].data.title).toBe('edited');
  });

  test('releasing a passive handle unsubscribes it, and a new subscription adds those still held', async () => {
    const { host, clientRepo, service } = await setupRecording();
    const kept = await createDirectory(host, 'kept');
    const released = await createDirectory(host, 'released');
    clientRepo.find(kept.hostHandle.documentId, { passive: { bytes: kept.bytes, heads: kept.heads } });
    clientRepo.find(released.hostHandle.documentId, { passive: { bytes: released.bytes, heads: released.heads } });
    await expect.poll(() => service.requests.flatMap(({ add }) => add ?? []).length).toBe(2);

    expect(clientRepo.release(released.hostHandle.documentId)).toBe(true);
    await expect
      .poll(() => service.requests.flatMap(({ removeIds }) => removeIds ?? []))
      .toEqual([released.hostHandle.documentId]);

    const before = service.requests.length;
    service.dropSubscription.wake();
    await expect
      .poll(() => service.requests.slice(before).flatMap(({ add }) => add ?? []))
      .toEqual([{ id: kept.hostHandle.documentId, heads: kept.heads, passive: true }]);
  });

  test('a remove that fails is not sent again for a document held again meanwhile', async () => {
    const { host, clientRepo, service } = await setupRecording();
    const { hostHandle, objectId, bytes, heads } = await createDirectory(host, 'shown');
    const documentId = hostHandle.documentId;
    clientRepo.find(documentId, { passive: { bytes, heads } });
    await expect.poll(() => service.requests.flatMap(({ add }) => add ?? []).length).toBe(1);

    const failing = new Trigger();
    service.failNext = failing;
    clientRepo.release(documentId);
    await expect.poll(() => service.inFlightFailure).toBe(true);
    const handle = clientRepo.find<DatabaseDirectory>(documentId, { passive: { bytes, heads } });
    failing.wake();
    await expect.poll(() => service.requests.at(-1)?.add?.map(({ id }) => id)).toEqual([documentId]);
    expect(service.requests.at(-1)?.removeIds).toEqual([]);

    hostHandle.change((doc) => {
      doc.objects![objectId].data.title = 'edited';
    });
    await host.flush(Context.default());
    await expect.poll(() => handle.passiveHeads).toEqual(A.getHeads(hostHandle.doc()!));
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

  test('a change the host delivers is not an unsaved change', async () => {
    const peer1 = await setup();
    const [repo1] = createProxyRepos(peer1.dataService);
    await openAndClose(repo1);

    const peer2 = await setup();
    const [repo2] = createProxyRepos(peer2.dataService);
    await openAndClose(repo2);
    const network = await new TestReplicationNetwork().open();
    await peer1.host.addReplicator(Context.default(), await network.createReplicator());
    await peer2.host.addReplicator(Context.default(), await network.createReplicator());

    const handle1 = repo1.create<{ text: string }>({ text: 'one' });
    await handle1.whenReady();
    await repo1.flush();
    const handle2 = repo2.find<{ text: string }>(handle1.url!);
    await handle2.whenReady();
    await peer1.host.flush(Context.default());

    const saveStates: string[][] = [];
    repo1.saveStateChanged.on(({ unsavedDocuments }) => {
      saveStates.push(unsavedDocuments);
    });
    const receivedChange = new Trigger();
    handle1.once('change', () => receivedChange.wake());
    handle2.change((doc: any) => {
      doc.text = 'two';
    });
    await receivedChange.wait();
    expect(handle1.doc().text).to.equal('two');
    expect(saveStates).to.deep.equal([]);

    handle1.change((doc: any) => {
      doc.text = 'three';
    });
    expect(saveStates).to.deep.equal([[handle1.documentId]]);
  });

  test('load document from disk', async () => {
    const dbPath = createTmpPath();

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
      const { runtime, dispose: disposeRuntime } = createTestSqliteRuntime(dbPath);
      onTestFinished(() => disposeRuntime());
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
    void handle.whenReady().then(
      () => {
        readyResolved = true;
      },
      (err) => {
        // The close at the end of the test settles the still-pending load.
        if (!(err instanceof RepoClosedError)) {
          throw err;
        }
      },
    );
    // Poll rather than block for a fixed delay: an accidental resolution flips `readyResolved`
    // immediately instead of only being checked once after the wait, and the expected outcome
    // is this timing out with the flag still `false`.
    await waitForCondition({ condition: () => readyResolved, timeout: 300 }).catch(() => {});

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
    const dbPath = createTmpPath();
    let url: AutomergeUrl;

    {
      const { runtime, dispose } = createTestSqliteRuntime(dbPath);
      const { host, dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const text = 'Hello World!';
      const clientHandle = clientRepo.create<{ text: string }>({ text: text });
      // Wait for the background auto-save to persist the object's heads without an explicit flush.
      await waitForCondition({ condition: () => documentHeadsPersisted(host, clientHandle), timeout: 2_000 });
      url = clientHandle.url!;
      await host.close();
      await clientRepo.close();
      await dispose();
    }

    {
      const { runtime, dispose: disposeRuntime } = createTestSqliteRuntime(dbPath);
      onTestFinished(() => disposeRuntime());
      const { dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);

      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  test('flush throws while the host refuses to create a document', { timeout: 5_000 }, async () => {
    const { dataService } = await setup(undefined, (props) => new RefusingDataService(props));
    const [clientRepo] = createProxyRepos(dataService);
    await clientRepo.open();

    const handle = clientRepo.create<{ text: string }>({ text: 'refused' });
    await expect(clientRepo.flush()).rejects.toThrow('document creation refused');

    // Closing settles the handle rather than leaving `whenReady` pending forever.
    await clientRepo.close();
    await expect(handle.whenReady()).rejects.toThrow('document creation refused');
  });

  test('a document the host failed to create is requested again without a flush', { timeout: 5_000 }, async () => {
    let refusing: RefusingDataService | undefined;
    const { dataService, host } = await setup(undefined, (props) => (refusing = new RefusingDataService(props)));
    invariant(refusing);
    const service = refusing;
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);
    const states: SaveStateChangedEvent[] = [];
    clientRepo.saveStateChanged.on((state) => {
      states.push(state);
    });

    const handle = clientRepo.create<{ text: string }>({ text: 'retried' });
    await expect.poll(() => states.at(-1)?.failing).toBe(true);

    service.refuse = false;
    await handle.whenReady();
    await expect.poll(() => clientRepo.hasUnsavedChanges()).toBe(false);
    expect(states.at(-1)?.failing).toBe(false);
    const hostHandle = await host.loadDoc<{ text: string }>(Context.default(), handle.url!);
    invariant(hostHandle);
    expect(hostHandle.doc()?.text).toEqual('retried');
  });

  test('a document deleted before the host created it is not requested again', { timeout: 5_000 }, async () => {
    let refusing: RefusingDataService | undefined;
    const { dataService } = await setup(undefined, (props) => (refusing = new RefusingDataService(props)));
    invariant(refusing);
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const handle = clientRepo.create<{ text: string }>({ text: 'deleted' });
    await expect(clientRepo.flush()).rejects.toThrow('document creation refused');
    const requests = refusing.requests;

    handle.delete();
    refusing.refuse = false;
    await clientRepo.flush();
    expect(refusing.requests).toEqual(requests);
  });

  test('a document whose initial value holds Automerge values reaches the host intact', async () => {
    const { dataService, host } = await setup();
    const [clientRepo] = createProxyRepos(withJsonEncodedCreations(dataService));
    await openAndClose(clientRepo);

    // A space root's links are `RawString`s, which the transport's JSON codec rejects as an initial value.
    const objectId = EntityId.random();
    const url = generateAutomergeUrl();
    const handle = clientRepo.create<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      links: { [objectId]: new A.RawString(url) },
    });
    await handle.whenReady();
    invariant(handle.url);
    const hostHandle = await host.loadDoc<DatabaseDirectory>(Context.default(), handle.url);
    invariant(hostHandle);
    await hostHandle.waitUntilReady();
    const link = hostHandle.doc()?.links?.[objectId];
    expect(link).toBeInstanceOf(A.RawString);
    expect(link?.toString()).toEqual(url);
  });

  test('a creation the transport refuses as invalid is reported once, not retried', { timeout: 5_000 }, async () => {
    const { dataService } = await setup();
    const { client, attempts } = withRefusedCreations(dataService);
    const [clientRepo] = createProxyRepos(client);
    await openAndClose(clientRepo);
    const states: SaveStateChangedEvent[] = [];
    clientRepo.saveStateChanged.on((state) => {
      states.push(state);
    });

    const handle = clientRepo.create<{ text: string }>({ text: 'refused' });
    await expect(handle.whenReady()).rejects.toThrow('Missing key');
    expect(states.at(-1)?.failing).toBe(true);
    // The next flush reports the refusal; later ones are not blocked by it.
    await expect(clientRepo.flush()).rejects.toThrow('Missing key');
    expect(states.at(-1)?.failing).toBe(false);

    // Successful update passes reset the send backoff; they must not re-request the refused creation.
    attempts.refuse = false;
    const other = clientRepo.create<{ count: number }>({ count: 0 });
    await other.whenReady();
    for (let count = 1; count <= 5; count++) {
      other.change((doc: { count: number }) => {
        doc.count = count;
      });
      await clientRepo.flush();
    }
    await sleep(500);
    expect(attempts.count).toBe(2);
  });

  test('document mutation persists with `flush`', async () => {
    const dbPath = createTmpPath();
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
      // Wait for the background auto-save to persist the mutation's heads without an explicit flush.
      await waitForCondition({ condition: () => documentHeadsPersisted(host, clientHandle), timeout: 2_000 });
      await host.close();
      await clientRepo.close();
      await dispose();
    }

    {
      const { runtime, dispose: disposeRuntime } = createTestSqliteRuntime(dbPath);
      onTestFinished(() => disposeRuntime());
      const { dataService } = await setup(runtime);
      const [clientRepo] = createProxyRepos(dataService);
      await openAndClose(clientRepo);

      const clientHandle = clientRepo.find<{ text: string }>(url);
      await asyncTimeout(clientHandle.whenReady(), 1000);

      expect(clientHandle.doc()?.text).to.equal('Hello World!');
    }
  });

  test('a disk flush saves only the documents written since the last one', async () => {
    let recorder: FlushRecordingDataService | undefined;
    const { dataService } = await setup(undefined, (props) => (recorder = new FlushRecordingDataService(props)));
    invariant(recorder);
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    type TestDoc = { text?: string };
    const first = clientRepo.create<TestDoc>();
    const second = clientRepo.create<TestDoc>();
    await clientRepo.flush({ disk: true });
    expect(new Set(recorder.flushed.at(-1))).toEqual(new Set([first.documentId, second.documentId]));

    first.change((doc: TestDoc) => (doc.text = 'changed'));
    await clientRepo.flush({ disk: true });
    expect(recorder.flushed.at(-1)).toEqual([first.documentId]);

    const flushes = recorder.flushed.length;
    await clientRepo.flush({ disk: true });
    expect(recorder.flushed.length).toBe(flushes);
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
    await hostHandle.waitUntilReady();
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
    await hostHandle.waitUntilReady();
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

    for (const lease of hostHandles) {
      await lease.waitUntilReady();
      await expect.poll(() => lease.doc()?.text, { timeout: 1000 }).toEqual(text);
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

  test('integrates a large host batch in order, yielding between slices', async () => {
    const { dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    // Enough Automerge loading that one batch cannot fit in a single slice.
    const count = 300;
    const handles = Array.from({ length: count }, () => clientRepo.create<{ text: string }>());
    await Promise.all(handles.map((handle) => handle.whenReady()));
    // A host batch arrives only once the host holds the subscription, and an injected one wakes the client as if it did.
    await clientRepo.flush();
    const payload = 'x'.repeat(4_000);
    const updates = handles.map((handle) => {
      const documentId = handle.documentId;
      invariant(documentId);
      return { documentId, mutation: A.save(A.from({ text: payload })) };
    });

    const integrated: number[] = [];
    const allIntegrated = new Trigger();
    handles.forEach((handle, index) =>
      handle.on('change', () => {
        integrated.push(index);
        if (integrated.length === count) {
          allIntegrated.wake();
        }
      }),
    );

    // A turn of the event loop taken while the batch is still being integrated is the yield.
    let integratedWhenLoopTurned = -1;
    void yieldToEventLoop().then(() => {
      integratedWhenLoopTurned = integrated.length;
    });
    clientRepo._receiveUpdate({ updates });
    expect(integrated.length).toBeGreaterThan(0);
    expect(integrated.length).toBeLessThan(count);

    await allIntegrated.wait({ timeout: 5_000 });
    expect(integrated).toEqual(handles.map((_, index) => index));
    expect(integratedWhenLoopTurned).toBeGreaterThan(0);
    expect(integratedWhenLoopTurned).toBeLessThan(count);
  });

  test('re-subscribes after the host drops the subscription', async () => {
    const { droppable, host, clientRepo, clientHandle } = await setupWithDroppableSubscription();

    droppable.dropSubscription.wake();
    await expect.poll(() => droppable.subscribeCount, { timeout: 5000 }).toEqual(2);

    const text = 'Hello World!';
    clientHandle.change((doc: { text: string }) => {
      doc.text = text;
    });
    await clientRepo.flush();

    const hostHandle = await host.loadDoc<{ text: string }>(Context.default(), clientHandle.url!);
    invariant(hostHandle);
    await hostHandle.waitUntilReady();
    await expect.poll(() => hostHandle.doc()?.text, { timeout: 5000 }).toEqual(text);
  });

  test('an unavailable report from the host settles the handle', async () => {
    const { dataService } = await setup(undefined, (props) => new UnavailableDataService(props));
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const clientHandle = clientRepo.find<{ text: string }>(generateAutomergeUrl());

    await expect(asyncTimeout(clientHandle.whenReady(), 1000)).rejects.toThrow(DocumentUnavailableError);
    expect(clientHandle.state).to.equal('unavailable');
  });

  test('flush during a dropped subscription delivers the write', async () => {
    const { droppable, host, clientRepo, clientHandle } = await setupWithDroppableSubscription();

    // Race the write against subscription recovery: `flush` must not resolve until the replacement
    // subscription has taken the mutation, since a short-lived writer closes right after it.
    droppable.dropSubscription.wake();
    const text = 'written mid-drop';
    clientHandle.change((doc: { text: string }) => {
      doc.text = text;
    });
    await clientRepo.flush();

    // No polling: `flush` resolving is the delivery guarantee under test.
    const hostHandle = await host.loadDoc<{ text: string }>(Context.default(), clientHandle.url!);
    invariant(hostHandle);
    await hostHandle.waitUntilReady();
    expect(hostHandle.doc()?.text).toEqual(text);
  });

  // `Resource` holds `_lifecycleState` at OPEN for the whole of `close()`, and the update job stays
  // set across `_close`'s `join()`, so a find landing inside the close passed both of those checks
  // while the context was already disposed — the handle it returned could never reach the host.
  test('find reports the client going away once close has begun', async () => {
    const { dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await clientRepo.open();
    const handle = clientRepo.create<{ text: string }>();
    await handle.whenReady();
    const url = handle.url;
    invariant(url);

    // The document is still in `_handles` here — `_close` clears the cache only after its `join()`
    // — so this is also the cached-hit path, which reached no guard at all before: `_getOrLoadHandle`
    // returned the cached handle before ever calling one.
    //
    // Not awaited, so the assertions run while the close is still in flight. `close()` awaits the
    // open promise before it starts, so the yield is what puts us inside the close rather than
    // before it — and the lifecycle state is still OPEN throughout.
    const closing = clientRepo.close();
    await yieldToEventLoop();
    expect(clientRepo.isOpen).to.be.false;

    expect(() => clientRepo.find(url)).to.throw(RepoClosedError);
    expect(() => clientRepo.create<{ text: string }>()).to.throw(RepoClosedError);
    await closing;
  });

  test('a load still in flight is settled when the proxy closes', async () => {
    const { dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await clientRepo.open();

    // The host has no bytes for this document and no peer to fetch them from, so only the close can
    // settle the load.
    const handle = clientRepo.find<{ text: string }>(generateAutomergeUrl());
    const ready = asyncTimeout(handle.whenReady(), 1_000);
    await clientRepo.close();

    await expect(ready).rejects.toThrow(RepoClosedError);
  });

  // `Trigger` marks its own promise handled, so settling a load nobody awaits must not surface as an
  // unhandled rejection; vitest reports one as an error for the run.
  test('closing with a load nobody awaits raises no unhandled rejection', async () => {
    const { dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await clientRepo.open();

    const handle = clientRepo.find<{ text: string }>(generateAutomergeUrl());
    await clientRepo.close();
    // Lets an unhandled rejection surface inside this test rather than a later one.
    await sleep(10);

    // The load is settled rather than left pending, even though nobody was waiting on it.
    await expect(asyncTimeout(handle.whenReady(), 1_000)).rejects.toThrow(RepoClosedError);
  });

  test('find on a closed proxy reports the client going away', async () => {
    const { dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await clientRepo.open();
    const handle = clientRepo.create<{ text: string }>();
    await handle.whenReady();
    const url = handle.url;
    invariant(url);
    await clientRepo.close();

    // A load started while the proxy was open routinely lands after it; the outcome is typed so a
    // caller that can abandon the work recognises it, rather than an assertion failure.
    expect(() => clientRepo.find(url)).to.throw(RepoClosedError);
    expect(() => clientRepo.create<{ text: string }>()).to.throw(RepoClosedError);
  });

  test('a write after close names what closed the proxy', async () => {
    const { dataService } = await setup();
    const [clientRepo] = createProxyRepos(dataService);
    await clientRepo.open();
    await clientRepo.close(new Context({ attributes: { [CLOSE_REASON_ATTRIBUTE]: 'invocation abandoned' } }));

    let error: unknown;
    try {
      clientRepo.create<{ text: string }>();
    } catch (err) {
      error = err;
    }
    invariant(error instanceof RepoClosedError);
    expect(error.context.closeReason).to.equal('invocation abandoned');
    // The cause's stack is the close call site, so it names this file rather than the write.
    invariant(error.cause instanceof Error);
    expect(error.cause.stack).to.include('repo-proxy.test.ts');
  });

  test('a failed update leaves the proxy usable and is retried', { timeout: 5_000 }, async () => {
    let failing: FailingUpdateDataService | undefined;
    const { dataService, host } = await setup(undefined, (props) => (failing = new FailingUpdateDataService(props)));
    invariant(failing);
    const service = failing;
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);

    const handle = clientRepo.create<{ text: string }>();
    await handle.whenReady();
    await clientRepo.flush();
    const url = handle.url;
    invariant(url);

    service.fail = true;
    handle.change((doc: { text: string }) => {
      doc.text = 'retried';
    });
    await expect.poll(() => service.failures, { timeout: 2_000 }).toBeGreaterThan(0);
    // A turn of the event loop lets a failure that escapes the proxy settle before the proxy is checked.
    await yieldToEventLoop();

    // The proxy still serves the database: the next object is created rather than refused.
    expect(clientRepo.isOpen).toBe(true);
    const next = clientRepo.create<{ text: string }>({ text: 'next' });

    service.fail = false;
    const hostText = async () => (await host.loadDoc<{ text: string }>(Context.default(), url))?.doc()?.text;
    await expect.poll(hostText, { timeout: 4_000 }).toEqual('retried');
    await next.whenReady();
  });

  test('a change the old host never took reaches the host that replaces it', { timeout: 5_000 }, async () => {
    const storage = createTestSqliteRuntime();
    onTestFinished(() => storage.dispose());
    let stuck: FailingUpdateDataService | undefined;
    const first = await setup(storage.runtime, (props) => (stuck = new FailingUpdateDataService(props)));
    invariant(stuck);
    const service = stuck;
    const [clientRepo] = createProxyRepos(first.dataService);
    await openAndClose(clientRepo);
    const handle = clientRepo.create<{ text: string }>();
    await handle.whenReady();
    await clientRepo.flush();

    const hold = new Trigger();
    service.hold = hold;
    onTestFinished(() => {
      hold.wake();
    });
    handle.change((doc: { text: string }) => {
      doc.text = 'kept';
    });
    await expect.poll(() => service.held).toBe(1);

    // A restarted worker opens the same storage and serves a fresh subscription.
    const second = await setup(storage.runtime);
    clientRepo._updateDataService(second.dataService);
    await clientRepo._onReconnect();

    const hostHandle = await second.host.loadDoc<{ text: string }>(Context.default(), handle.url!);
    invariant(hostHandle);
    await hostHandle.waitUntilReady();
    expect(hostHandle.doc()?.text).toEqual('kept');
    expect(clientRepo.hasUnsavedChanges()).toBe(false);
  });

  test('a failed pass that carried no changes is not reported as failing', { timeout: 5_000 }, async () => {
    let failing: FailingUpdateDataService | undefined;
    const { dataService } = await setup(undefined, (props) => (failing = new FailingUpdateDataService(props)));
    invariant(failing);
    const service = failing;
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);
    const handle = clientRepo.create<{ text: string }>();
    await handle.whenReady();
    await clientRepo.flush();
    const states: SaveStateChangedEvent[] = [];
    clientRepo.saveStateChanged.on((state) => {
      states.push(state);
    });

    service.failSubscription = true;
    invariant(handle.documentId);
    clientRepo.release(handle.documentId);
    await expect.poll(() => service.subscriptionFailures).toBeGreaterThan(0);
    expect(states.some((state) => state.failing)).toBe(false);
    expect(clientRepo.hasUnsavedChanges()).toBe(false);
  });

  test('a proxy that is never closed is still collectable', { timeout: 30_000 }, async () => {
    makeGlobalAnEventTargetLikeWorkerd();
    setFlagsFromString('--expose_gc');
    const gc: () => void = runInNewContext('gc');

    let props: DataServiceProps | undefined;
    await setup(undefined, (captured) => new DataServiceImpl((props = captured)));
    invariant(props);
    let live = 0;
    const registry = new FinalizationRegistry(() => {
      live--;
    });
    // Opened in its own frame so no local of the test's suspended frame still points at the last one.
    const openUnclosedOnOwnTransport = async (handlers: DataService.Handlers) => {
      const dataService = await EffectEx.runPromise(
        makeInProcessClient(DataService.Rpcs, handlers).pipe(
          Effect.provideService(Scope.Scope, Effect.runSync(Scope.make())),
        ),
      );
      const repo = new RepoProxy(dataService, EffectContext.empty(), SpaceId.random());
      await repo.open();
      registry.register(repo, undefined);
      live++;
    };
    for (let index = 0; index < 10; index++) {
      await openUnclosedOnOwnTransport(new SubscriberlessDataService(props));
    }

    await expect
      .poll(
        () => {
          gc();
          return live;
        },
        { timeout: 20_000 },
      )
      .toBe(0);
  });

  test('a closed proxy has nothing unsaved', { timeout: 5_000 }, async () => {
    let failing: FailingUpdateDataService | undefined;
    const { dataService } = await setup(undefined, (props) => (failing = new FailingUpdateDataService(props)));
    invariant(failing);
    const service = failing;
    const [clientRepo] = createProxyRepos(dataService);
    await clientRepo.open();
    const handle = clientRepo.create<{ text: string }>();
    await handle.whenReady();
    await clientRepo.flush();

    service.fail = true;
    handle.change((doc: { text: string }) => {
      doc.text = 'never sent';
    });
    await expect.poll(() => service.failures).toBeGreaterThan(0);
    expect(clientRepo.hasUnsavedChanges()).toBe(true);

    await clientRepo.close();
    expect(clientRepo.hasUnsavedChanges()).toBe(false);
  });

  test('a change the host has not taken stays unsaved, and a failed send is reported', { timeout: 5_000 }, async () => {
    let failing: FailingUpdateDataService | undefined;
    const { dataService } = await setup(undefined, (props) => (failing = new FailingUpdateDataService(props)));
    invariant(failing);
    const service = failing;
    const [clientRepo] = createProxyRepos(dataService);
    await openAndClose(clientRepo);
    const handle = clientRepo.create<{ text: string }>();
    await handle.whenReady();
    await clientRepo.flush();
    const states: SaveStateChangedEvent[] = [];
    clientRepo.saveStateChanged.on((state) => {
      states.push(state);
    });

    const hold = new Trigger();
    service.hold = hold;
    handle.change((doc: { text: string }) => {
      doc.text = 'unsaved';
    });
    await expect.poll(() => service.held).toBe(1);
    // In flight: the batch has left the pending set, but the host has not acknowledged it.
    expect(clientRepo.hasUnsavedChanges()).toBe(true);
    expect(states.at(-1)).toEqual({ unsavedDocuments: [handle.documentId], pendingCreations: 0, failing: false });

    service.hold = undefined;
    service.fail = true;
    hold.wake();
    await expect.poll(() => states.at(-1)?.failing).toBe(true);
    expect(clientRepo.hasUnsavedChanges()).toBe(true);

    service.fail = false;
    await expect.poll(() => clientRepo.hasUnsavedChanges(), { timeout: 4_000 }).toBe(false);
    expect(states.at(-1)).toEqual({ unsavedDocuments: [], pendingCreations: 0, failing: false });
  });
});

/**
 * A repo whose document handle is registered with a first subscription that
 * {@link DroppableDataService.dropSubscription} ends on demand.
 */
const makeGlobalAnEventTargetLikeWorkerd = () => {
  const target = new EventTarget();
  for (const method of ['addEventListener', 'removeEventListener'] as const) {
    const previous = Reflect.get(globalThis, method);
    Reflect.set(globalThis, method, target[method].bind(target));
    onTestFinished(() => {
      Reflect.set(globalThis, method, previous);
    });
  }
};

const setupWithDroppableSubscription = async () => {
  let droppable: DroppableDataService | undefined;
  const { dataService, host } = await setup(undefined, (props) => (droppable = new DroppableDataService(props)));
  invariant(droppable);

  const [clientRepo] = createProxyRepos(dataService);
  await openAndClose(clientRepo);

  const clientHandle = clientRepo.create<{ text: string }>();
  await clientHandle.whenReady();
  await clientRepo.flush();

  return { droppable, host, clientRepo, clientHandle };
};

class SubscriberlessDataService extends DataServiceImpl {
  override ['DataService.subscribe'](): EffectStream.Stream<DataService.BatchedDocumentUpdates, Error> {
    return EffectStream.never;
  }
}

/** Fails every document creation, as a host that is gone or refuses the call does. */
class RefusingDataService extends DataServiceImpl {
  'refuse' = true;
  'requests' = 0;

  override ['DataService.createDocument'](
    request: DataService.CreateDocumentRequest,
  ): Effect.Effect<DataService.CreateDocumentResponse, Error> {
    this.requests++;
    return this.refuse
      ? Effect.fail(new EchoClientError({ message: 'document creation refused' }))
      : super['DataService.createDocument'](request);
  }
}

/** Encodes each creation request as the worker transport's client does before sending it. */
const withJsonEncodedCreations = (dataService: DataService.Client): DataService.Client => {
  const encode = Schema.encodeUnknownEffect(Schema.toCodecJson(DataService.CreateDocumentRequest));
  return Object.assign(Object.create(dataService), {
    'DataService.createDocument': (request: DataService.CreateDocumentRequest) =>
      encode(request).pipe(Effect.flatMap(() => dataService['DataService.createDocument'](request))),
  });
};

/** Fails each creation with a `SchemaError` while {@link refuse} is set, as a transport that cannot encode it does. */
const withRefusedCreations = (dataService: DataService.Client) => {
  const attempts = { count: 0, refuse: true };
  const invalid = Schema.decodeUnknownEffect(DataService.CreateDocumentResponse)({});
  const client: DataService.Client = Object.assign(Object.create(dataService), {
    'DataService.createDocument': (request: DataService.CreateDocumentRequest) => {
      attempts.count++;
      return attempts.refuse ? invalid : dataService['DataService.createDocument'](request);
    },
  });
  return { client, attempts };
};

/**
 * Fails every update batch while {@link fail} is set, as a host that times out the call does; while
 * {@link hold} is set, an update waits on it first, as one whose write cannot reach disk does.
 * {@link failSubscription} fails subscription changes the same way.
 */
class FailingUpdateDataService extends DataServiceImpl {
  'fail' = false;
  'failures' = 0;
  'hold': Trigger | undefined = undefined;
  'held' = 0;
  'failSubscription' = false;
  'subscriptionFailures' = 0;

  override ['DataService.updateSubscription'](
    request: DataService.UpdateSubscriptionRequest,
  ): Effect.Effect<void, Error> {
    if (this.failSubscription) {
      this.subscriptionFailures++;
      return Effect.fail(new EchoClientError({ message: 'subscription update timed out' }));
    }
    return super['DataService.updateSubscription'](request);
  }

  override ['DataService.update'](request: DataService.UpdateRequest): Effect.Effect<void, Error> {
    const hold = this.hold;
    if (hold) {
      this.held++;
      return Effect.promise(() => hold.wait()).pipe(Effect.andThen(() => this.#update(request)));
    }
    return this.#update(request);
  }

  #update(request: DataService.UpdateRequest): Effect.Effect<void, Error> {
    if (this.fail) {
      this.failures++;
      return Effect.fail(new EchoClientError({ message: 'update timed out' }));
    }
    return super['DataService.update'](request);
  }
}

class RecordingDataService extends DataServiceImpl {
  readonly 'requests': DataService.UpdateSubscriptionRequest[] = [];
  readonly 'dropSubscription' = new Trigger();
  'failNext': Trigger | undefined = undefined;
  'inFlightFailure' = false;
  #subscribeCount = 0;

  override ['DataService.subscribe'](request: DataService.SubscribeRequest) {
    const stream = super['DataService.subscribe'](request);
    return this.#subscribeCount++ === 0
      ? stream.pipe(EffectStream.interruptWhen(Effect.promise(() => this.dropSubscription.wait())))
      : stream;
  }

  override ['DataService.updateSubscription'](
    request: DataService.UpdateSubscriptionRequest,
  ): Effect.Effect<void, Error> {
    const fail = this.failNext;
    if (fail) {
      this.failNext = undefined;
      this.inFlightFailure = true;
      return Effect.promise(() => fail.wait()).pipe(
        Effect.andThen(Effect.fail(new EchoClientError({ message: 'update timed out' }))),
      );
    }
    this.requests.push(request);
    return super['DataService.updateSubscription'](request);
  }
}

const setupRecording = async () => {
  let recording: RecordingDataService | undefined;
  const { dataService, host } = await setup(undefined, (props) => (recording = new RecordingDataService(props)));
  invariant(recording);
  const [clientRepo] = createProxyRepos(dataService);
  await openAndClose(clientRepo);
  return { host, clientRepo, service: recording };
};

const createDirectory = async (host: AutomergeHost, title: string) => {
  const objectId = EntityId.random();
  const hostHandle = await host.createDoc<DatabaseDirectory>({
    version: SpaceDocVersion.CURRENT,
    access: { spaceId: SpaceId.random() },
    objects: {
      [objectId]: EntityStructure.makeObject({ type: DXN.make('com.example.type.test', '0.1.0'), data: { title } }),
    },
    links: {},
  });
  await host.flush(Context.default());
  return { hostHandle, objectId, bytes: A.save(hostHandle.doc()!), heads: A.getHeads(hostHandle.doc()!) };
};

/** Records the documents each disk flush asks the host to save. */
class FlushRecordingDataService extends DataServiceImpl {
  readonly 'flushed': string[][] = [];

  override ['DataService.flush'](request: DataService.FlushRequest): Effect.Effect<void, Error> {
    this.flushed.push([...(request.documentIds ?? [])]);
    return super['DataService.flush'](request);
  }
}

/**
 * A host that holds none of the documents it is asked for and reports each as unavailable, as the
 * EDGE data plane does for a space whose documents never replicated to it. Neither call reaches the
 * real host: a document it is still fetching is a different answer (`requesting`), and the one under
 * test is the host having nothing and fetching nothing.
 */
class UnavailableDataService extends DataServiceImpl {
  #emit: ((updates: DataService.BatchedDocumentUpdates) => void) | undefined;

  override ['DataService.subscribe'](
    _request: DataService.SubscribeRequest,
  ): EffectStream.Stream<DataService.BatchedDocumentUpdates, Error> {
    return EffectEx.streamFromEmitter<DataService.BatchedDocumentUpdates, Error>((emit) => {
      this.#emit = (updates) => void emit.single(updates);
      // Ready beacon: `RepoProxy` gates every `updateSubscription` on the subscription's first batch.
      this.#emit({ updates: [] });
      return Effect.sync(() => {
        this.#emit = undefined;
      });
    });
  }

  override ['DataService.updateSubscription']({
    add,
  }: DataService.UpdateSubscriptionRequest): Effect.Effect<void, Error> {
    return Effect.sync(() => {
      this.#emit?.({ updates: (add ?? []).map(({ id }) => ({ documentId: id, unavailable: true })) });
    });
  }
}

/**
 * Ends the first `subscribe` stream on demand, so the host runs the finalizer that forgets the
 * subscription while the client stays connected — the shape that made every later call on that
 * subscription id fail with "Subscription not found".
 */
class DroppableDataService extends DataServiceImpl {
  readonly 'dropSubscription' = new Trigger();
  'subscribeCount' = 0;

  override ['DataService.subscribe'](request: DataService.SubscribeRequest) {
    const stream = super['DataService.subscribe'](request);
    return this.subscribeCount++ === 0
      ? stream.pipe(EffectStream.interruptWhen(Effect.promise(() => this.dropSubscription.wait())))
      : stream;
  }
}

const setup = async (
  runtime?: ReturnType<typeof createTestSqliteRuntime>['runtime'],
  createDataService: (props: DataServiceProps) => DataService.Handlers = (props) => new DataServiceImpl(props),
) => {
  if (!runtime) {
    const handle = createTestSqliteRuntime();
    onTestFinished(() => handle.dispose());
    runtime = handle.runtime;
  }
  const host = new AutomergeHost({ runtime });
  await openAndClose(host);

  const dataServiceImpl = createDataService({
    automergeHost: host,
    spaceStateManager: new SpaceStateManager({ runtime }),
    updateIndexes: async () => {},
    getSpaceStats: async () => ({
      objects: { alive: 0, deleted: 0 },
      documents: 0,
      feeds: 0,
      feedBlocks: 0,
      loaded: { documents: 0, documentsTotal: 0, queriesTotal: 0, leases: 0 },
    }),
    runGarbageCollection: async () => ({
      unlinkedObjects: 0,
      removedDocuments: 0,
      removedIndexEntries: 0,
      purgedFeedBlocks: 0,
    }),
    indexStatus: new IndexStatusTracker(),
  });

  // Bridge the host's DataService handlers to an in-process effect-rpc client (no wire hop).
  // The bridged client lives on a scope that is closed when the test finishes.
  const serviceScope = Effect.runSync(Scope.make());
  onTestFinished(async () => {
    await EffectEx.runPromise(Scope.close(serviceScope, Exit.void));
  });
  const dataService = await EffectEx.runPromise(
    makeInProcessClient(DataService.Rpcs, dataServiceImpl).pipe(Effect.provideService(Scope.Scope, serviceScope)),
  );

  const refreshCollectionState = async () => {
    const documentIds = host.loadedDocumentIds;
    log('refreshCollectionState', { documentIds });
    await host.updateLocalCollectionState('default', documentIds);
  };
  return { host, dataService, refreshCollectionState };
};

function* createProxyRepos(dataService: DataService.Client): Generator<RepoProxy> {
  for (let i = 0; i < 1_00; i++) {
    // Counter just to protect against infinite loops.
    yield new RepoProxy(dataService, EffectContext.empty(), SpaceId.random());
  }
  throw new Error('Too many repos requested');
}
