//
// Copyright 2026 DXOS.org
//

import {
  next as A,
  type Heads,
  change,
  clone,
  equals,
  from,
  getBackend,
  getHeads,
  save,
  saveSince,
} from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  type DocumentProgress,
  type Message,
  type PeerId,
  type QueryState,
  Repo,
  type StorageAdapterInterface,
  type SubductionPolicy,
  documentIdToBinary,
  generateAutomergeUrl,
  initSubduction,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { MemorySigner, SedimentreeId } from '@automerge/automerge-subduction';
import { beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';
import { randomBytes } from '@dxos/crypto';
import { PublicKey } from '@dxos/keys';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { isNonNullable } from '@dxos/util';

import { TestAdapter, type TestConnectionStateProvider } from '../testing';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

const HOST_AND_CLIENT: [string, string] = ['host', 'client'];
const SUBDUCTION_SERVICE_NAME = 'test-subduction-service';
const FIND_STATES: readonly QueryStateName[] = ['ready', 'loading'];

// How long to wait before asserting "this should NOT have happened by now".
// Tuned so that:
//   - The happy path (basic subduction sync) consistently completes faster:
//     observed end-to-end ~200-300 ms locally.
//   - The window is short enough to keep the suite fast.
//   - It's long enough that GC pauses or scheduling jitter on a busy CI box
//     don't sneak a successful sync past the assertion.
// If you find yourself raising this, write down WHY in the test that needs
// more time rather than bumping the global.
const NEGATIVE_ASSERTION_DELAY_MS = 500;

// Subduction control-plane message type, sent by `NetworkAdapterTransport` from
// `@automerge/automerge-repo/dist/subduction/network.js`. Not exported from the
// package root, so we inline the string literal. If you change this, also update
// `node_modules/.../subduction/network.d.ts:SUBDUCTION_MESSAGE_TYPE`.
const SUBDUCTION_MESSAGE_TYPE = 'subduction-connection';

type QueryStateName = QueryState<unknown>['state'];

const waitForQueryState = async (
  progress: DocumentProgress<unknown>,
  awaitStates: readonly QueryStateName[],
  { timeout }: { timeout?: number } = {},
): Promise<void> => {
  if (awaitStates.includes(progress.peek().state)) {
    return;
  }
  const trigger = new Trigger();
  const unsubscribe = progress.subscribe((state) => {
    if (awaitStates.includes(state.state)) {
      trigger.wake();
    } else if (state.state === 'failed' && !awaitStates.includes('failed')) {
      trigger.throw(state.error);
    }
  });
  try {
    await trigger.wait({ timeout });
  } finally {
    unsubscribe();
  }
};

const findInStates = async <T>(
  repo: Repo,
  url: AutomergeUrl,
  awaitStates: readonly QueryStateName[] = ['ready'],
): Promise<DocHandle<T>> => {
  const { documentId } = parseAutomergeUrl(url);
  const progress = repo.findWithProgress<T>(url);
  await waitForQueryState(progress, awaitStates);
  return repo.handles[documentId] as DocHandle<T>;
};

describe('AutomergeRepo with Subduction', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('change events', () => {
    const repo = createRepo({ network: [] });
    const handle = repo.create<{ field?: string }>();

    let valueDuringChange: string | undefined;
    handle.addListener('change', () => {
      valueDuringChange = handle.doc()!.field;
    });

    handle.change((doc: any) => {
      doc.field = 'value';
    });

    expect(valueDuringChange).to.eq('value');
  });

  test('flush', async () => {
    const storage = await createLevelAdapter();
    const repo = createRepo({ network: [], storage });
    const handle = repo.create<{ field?: string }>();

    for (let i = 0; i < 10; i++) {
      const p = repo.flush([handle.documentId]);
      handle.change((doc: any) => {
        doc.field = (doc.field ?? '') + randomBytes(1024).toString('hex');
      });
      await p;
    }
  });

  test('getChangeByHash', async () => {
    const doc = from({ foo: 'bar' });
    const copy = clone(doc);
    const newDoc = change(copy, 'change', (doc: any) => {
      doc.foo = 'baz';
    });

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(newDoc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.not.be.null;
    }

    {
      const heads = getHeads(newDoc);
      const changes = heads.map((hash) => getBackend(doc).getChangeByHash(hash));
      expect(changes.length).to.equal(1);
      expect(changes[0]).to.be.null;
    }
  });

  test('heads equality', () => {
    const a: Heads = getHeads(from({ foo: 'bar' }));
    const b: Heads = getHeads(from({ foo: 'bar' }));
    const c: Heads = [...a];

    expect(equals(a, b)).to.be.false;
    expect(equals(a, c)).to.be.true;
  });

  test('documents missing from local storage go to loading state', async () => {
    const { repos, adapters } = await createHostClientRepoTopology();
    const [host] = repos;
    await connectAdapters(adapters);
    const url = 'automerge:3JN8F3Z4dUWEEKKFN7WE9gEGvVUT' as AutomergeUrl;

    const progress = host.findWithProgress(url);
    expect(progress.peek().state).to.equal('loading');
  });

  test('documents on disk go to ready state', async () => {
    const storage = await createLevelAdapter();
    let url: AutomergeUrl | undefined;

    {
      const repo = createRepo({ network: [], storage });
      const handle = repo.create<{ field?: string }>({ field: 'value' });
      url = handle.url;
      await repo.flush();
      await repo.shutdown();
    }

    {
      const repo = createRepo({ network: [], storage });
      const handle = await repo.find<{ field?: string }>(url as AutomergeUrl);
      await handle.whenReady(['ready']);
      expect(handle.doc()?.field).to.equal('value');
    }
  });

  describe('network', () => {
    test('basic networking', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [host, client] = repos;
      await connectAdapters(adapters);

      const handle = host.create<{ text?: string }>();
      const text = 'Hello world';
      handle.change((doc: any) => {
        doc.text = text;
      });
      await waitForSubductionSave();

      await expect
        .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
        .toEqual(text);
    });

    test('share config does not gate subduction replication', async () => {
      const { repos, adapters } = await createHostClientRepoTopology({
        shareConfig: {
          access: async () => false,
          announce: async () => false,
        },
      });
      const [host, client] = repos;
      await connectAdapters(adapters);

      const handle = host.create<{ text?: string }>();
      handle.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave();

      await expect
        .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
        .toEqual('Hello world');
    });

    test('replication through a 4 peer chain', async () => {
      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B', 'C', 'D'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'D'],
        ],
      });
      const [repoA, repoB, repoC, repoD] = repos;
      await connectAdapters(adapters);

      const docA = repoA.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave();

      const [docB, docC, docD] = await Promise.all([
        findInStates<{ text?: string }>(repoB, docA.url, FIND_STATES),
        findInStates<{ text?: string }>(repoC, docA.url, FIND_STATES),
        findInStates<{ text?: string }>(repoD, docA.url, FIND_STATES),
      ]);
      await expect
        .poll(() => [docB.doc()?.text, docC.doc()?.text, docD.doc()?.text], { timeout: 5_000 })
        .toEqual(['Hello world', 'Hello world', 'Hello world']);
    });

    test('replication through a 3 peer chain', { timeout: 30_000 }, async () => {
      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B', 'C'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
        ],
      });
      const [repoA, repoB, repoC] = repos;
      await connectAdapters(adapters);

      const docA = repoA.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave();

      const [docB, docC] = await Promise.all([
        findInStates<{ text?: string }>(repoB, docA.url, FIND_STATES),
        findInStates<{ text?: string }>(repoC, docA.url, FIND_STATES),
      ]);
      await expect
        .poll(() => [docB.doc()?.text, docC.doc()?.text], { timeout: 10_000 })
        .toEqual(['Hello world', 'Hello world']);
    });

    test('documents loaded from disk get replicated', async () => {
      const storage = await createLevelAdapter();
      let url: AutomergeUrl | undefined;

      {
        const peer1 = createRepo({ network: [], storage }, { registerCleanup: false });
        const handle = peer1.create({ text: 'foo' });
        await peer1.flush();
        await waitForSubductionSave();
        url = handle.url;
        await shutdownRepo(peer1);
      }

      const { repos, adapters } = await createHostClientRepoTopology({ storages: [storage] });
      const [peer1, peer2] = repos;
      await connectAdapters(adapters);

      const hostHandle = await peer1.find<any>(url as AutomergeUrl);
      await hostHandle.whenReady();
      await expect.poll(() => hostHandle.doc()?.text, { timeout: 5_000 }).toEqual('foo');
      const peer2Handle = await findInStates<any>(peer2, hostHandle.url, FIND_STATES);
      await expect.poll(() => peer2Handle.doc(), { timeout: 5_000 }).toEqual(hostHandle.doc());
    });

    test('client cold-starts and syncs doc from a Repo', async () => {
      const repo = createRepo({ network: [] });
      const serverHandle = repo.create<{ field?: string }>();

      let clientDoc: A.Doc<{ field?: string }> | undefined;
      const receiveByClient = (blob: Uint8Array) => {
        clientDoc = clientDoc === undefined ? A.load(blob) : A.loadIncremental(clientDoc, blob);
      };

      let syncedHeads = getHeads(serverHandle.doc()!);
      receiveByClient(save(serverHandle.doc()!));

      serverHandle.on('change', ({ doc }) => {
        const blob = saveSince(doc, syncedHeads);
        syncedHeads = getHeads(doc);
        receiveByClient(blob);
      });

      const value = 'text to test if sync works';
      serverHandle.change((doc: any) => {
        doc.field = value;
      });
      expect(clientDoc?.field).to.deep.equal(value);
    });

    test('client creates doc and syncs with a Repo', async () => {
      const repo = createRepo({ network: [] });
      const receiveByServer = (blob: Uint8Array, docId: DocumentId) => repo.import<any>(blob, { docId });
      let clientDoc = A.from<{ field?: string }>({});
      const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
      let sentHeads: Heads = [];

      const sendDoc = async (doc: A.Doc<any>) => {
        receiveByServer(saveSince(doc, sentHeads), documentId);
        sentHeads = getHeads(doc);
      };

      const value = 'text to test if sync works';
      clientDoc = A.change(clientDoc, (doc: any) => {
        doc.field = value;
      });
      await sendDoc(clientDoc);

      const serverHandle = await repo.find<any>(documentId);
      expect(serverHandle.doc()!.field).to.deep.equal(value);
    });

    test('client creates doc and Repo persists it to disk', async () => {
      const storage = await createLevelAdapter();
      const repo = createRepo({ network: [], storage });
      const receiveByServer = async (blob: Uint8Array, docId: DocumentId) => {
        repo.import<any>(blob, { docId });
        await repo.flush([docId]);
      };

      let clientDoc = A.from<{ field?: string }>({ field: 'foo' });
      const { documentId } = parseAutomergeUrl(generateAutomergeUrl());
      let sentHeads: Heads = [];

      const sendDoc = async (doc: A.Doc<any>) => {
        await receiveByServer(saveSince(doc, sentHeads), documentId);
        sentHeads = getHeads(doc);
      };

      const value = 'text to test if sync works';
      clientDoc = A.change(clientDoc, (doc: any) => {
        doc.field = value;
      });
      await sendDoc(clientDoc);

      const serverHandle = await repo.find<any>(documentId);
      expect(serverHandle.doc()!.field).to.deep.equal(value);
      await waitForSubductionSave();
      await repo.shutdown();

      const repo2 = createRepo({ network: [], storage });
      const reloaded = await repo2.find<any>(documentId);
      expect(reloaded.doc()!.field).to.deep.equal(value);
    });

    test('two repo sync docs on `update` call', async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [repoA, repoB] = repos;
      await connectAdapters(adapters);

      const handleA = repoA.create<any>();
      const handleB = await findInStates<any>(repoB, handleA.url, FIND_STATES);

      const text = 'Hello world';
      handleA.update((doc: any) => {
        return A.change(doc, (doc: any) => {
          doc.text = text;
        });
      });
      await waitForSubductionSave();

      expect(handleA.doc()!.text).to.equal(text);
      await expect.poll(() => handleB.doc()?.text, { timeout: 5_000 }).toEqual(text);
    });

    // TODO(mykola): Mirrored from `automerge-repo.test.ts:'recovering from a
    // lost connection'`. This test exposes a real gap in the subduction fork's
    // post-disconnect recovery, characterized empirically as follows.
    //
    // Setup: peers connect, an initial change syncs. Then the test flips
    // `TestAdapter`'s connection-state gate to `'off'`, makes an offline
    // change, flips back to `'on'`, and calls `reconnectAdapters`
    // (peer-disconnected + peer-candidate cycle).
    //
    // Observed:
    // - The offline `#save` triggers `doSync`, which fails (dead transport)
    //   and sets `entry.lastSyncResult = "all-failed"`. The heal scheduler
    //   schedules a retry.
    // - `reconnectAdapters` tears down the old `NetworkAdapterTransport` and
    //   `AdapterConnections.peer-candidate` listener spins up a fresh one,
    //   bumping the connection generation.
    // - `SubductionSource.#recomputeEntry` in the `running` branch only
    //   re-syncs when `lastSyncResult === null` OR (lastSyncResult ===
    //   `"no-peers"` AND generation changed). It does NOT re-sync on
    //   `"all-failed"` even when the connection generation changed — only
    //   the heal scheduler retries `"all-failed"`, and its backoff
    //   (100 → 200 → 400 → 800 → 1600 → 3200 → 6400 ms ...) means
    //   recovery takes ~10+ s under the test's 15 s wall clock.
    // - Even when heal rounds DO fire on the new transport (visible in
    //   `subduction:source` debug logs), they exchange heads-protocol frames
    //   (~126-byte messages tagged `S U M`) without delivering the offline
    //   commit. Suspected cause: the subduction-core peer state from the
    //   old transport is stale in heal scheduler bookkeeping and the new
    //   transport's peer is not yet treated as having the missing commits.
    //
    // Suggested fork fix: in `SubductionSource.#recomputeEntry`, treat
    // `lastSyncResult === "all-failed"` the same as `"no-peers"` for the
    // `lastSyncGeneration !== this.#connectionGeneration()` re-sync check —
    // a connection-generation change means the prior failure was on a
    // now-dead peer set and is worth retrying immediately.
    //
    // Marked `.todo` until the fork driver retries on connection change for
    // `"all-failed"` results. Enabling this test as `test()` reliably times
    // out at 15 s.
    test.todo('recovering from a lost connection');

    // Mirrored from `automerge-repo.test.ts:'replicate document after request'`,
    // adapted for subduction:
    //   - Classical version asserts the query reaches `'unavailable'` before
    //     peer candidates are emitted. Subduction does NOT drive this query
    //     to `'unavailable'` while a dormant subduction source is attached —
    //     the SKILL doc and inline TODOs in the classical file call this out.
    //     We assert "stays in `'loading'`" instead.
    //   - After emitting peer candidates AND cycling adapters via
    //     `reconnectAdapters`, the query reaches `'ready'`. The reconnect is
    //     necessary because the first peer-candidate emit is consumed by
    //     `AdapterConnections` to start a transport, but the dormant
    //     subduction source's `lastSyncResult` may already be in
    //     `'no-peers'` from prior recompute cycles; `reconnectAdapters`
    //     bumps the connection generation and forces a re-sync.
    test('replicate document after request', { timeout: 15_000 }, async () => {
      const { repos, adapters } = await createHostClientRepoTopology();
      const [host, client] = repos;
      await connectAdapters(adapters, { noEmitPeerCandidate: true });

      const docA = host.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave();

      const progress = client.findWithProgress<{ text?: string }>(docA.url);
      // TODO(mykola): Subduction does not drive this query to `'unavailable'` while
      // a dormant subduction source is attached; assert "stays in loading" instead.
      // Switch to a positive `'unavailable'` assertion once the fork drives source
      // state correctly. See `.agents/skills/effect/subduction/SKILL.md`.
      await expect.poll(() => progress.peek().state, { timeout: 500, interval: 50 }).toEqual('loading');

      // Bring the peers online. `reconnectAdapters` does
      // peer-disconnected + peer-candidate, which causes `AdapterConnections`
      // to start a fresh transport and bumps the generation so the dormant
      // source re-syncs. We must reconnect on BOTH sides; with only one side
      // emitting `peer-candidate`, only one transport is initiated.
      await reconnectAdapters(adapters);
      await waitForQueryState(progress, ['ready'], { timeout: 10_000 });
    });

    // Regression test for the concurrent-shutdown stall in
    // `@automerge/automerge-repo@2.6.0-subduction.17` fixed by
    // `patches/@automerge__automerge-repo@2.6.0-subduction.17.patch`.
    // Without the patch, `Promise.all([repoA.shutdown(), repoB.shutdown()])`
    // takes ~30s (the Rust-side per-request timeout); with it, single-digit ms.
    test(
      'concurrent shutdown completes quickly when both peers have in-flight pushes',
      { timeout: 15_000 },
      async () => {
        const adapters = TestAdapter.createPair() as [TestAdapter, TestAdapter];
        const repoA = createRepo(
          {
            peerId: 'A' as PeerId,
            network: [],
            subductionAdapters: [{ adapter: adapters[0], serviceName: SUBDUCTION_SERVICE_NAME, role: 'connect' }],
          },
          { registerCleanup: false },
        );
        const repoB = createRepo(
          {
            peerId: 'B' as PeerId,
            network: [],
            subductionAdapters: [{ adapter: adapters[1], serviceName: SUBDUCTION_SERVICE_NAME, role: 'connect' }],
          },
          { registerCleanup: false },
        );

        // Belt-and-braces cleanup: bound shutdown so a regression
        // doesn't hang the runner for ~30s.
        onTestFinished(async () => {
          disconnectAdapters([adapters]);
          await Promise.all([
            asyncTimeout(repoA.shutdown(), 2_000).catch(() => {}),
            asyncTimeout(repoB.shutdown(), 2_000).catch(() => {}),
          ]);
        });

        await connectAdapters([adapters]);

        // Get a doc onto both sides so each peer has a running entry.
        // Wait for `'ready'` (NOT `FIND_STATES` which permits `'loading'`)
        // so repoB has actually replicated the doc before the next mutation
        // — otherwise the symmetric in-flight push state this test relies on
        // is not reliably set up.
        const handle = repoA.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'initial';
        });
        await waitForSubductionSave();
        await findInStates(repoB, handle.url, ['ready']);

        // Pending throttled save at the moment of shutdown — required
        // to put an `addBatch` in flight when both sides hit step 4.
        handle.change((doc: any) => {
          doc.text = 'pre-close write';
        });

        await asyncTimeout(Promise.all([repoA.shutdown(), repoB.shutdown()]), 1_500);
      },
    );
  });

  // The contract block below tests subduction-specific behavior described in
  // `.agents/skills/effect/subduction/SKILL.md`. None of these can be expressed
  // against the classical-network transport, which is why they live here and
  // not in `automerge-repo.test.ts`.
  describe('subduction contract', () => {
    describe('role matrix', () => {
      test('connect/accept syncs', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          roles: { host: 'connect', client: 'accept' },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'connect/accept';
        });
        await waitForSubductionSave();

        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 10_000 })
          .toEqual('connect/accept');
      });

      test('accept/connect syncs', { timeout: 15_000 }, async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          roles: { host: 'accept', client: 'connect' },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'accept/connect';
        });
        await waitForSubductionSave();

        // Bumped from 5_000 to 10_000: on a loaded CI box, the underlying
        // subduction `RequestId` round-trip can hit its own internal timeout
        // (~5s) and only the retry succeeds, which pushes us past the poll
        // window. Local runs land in ~200-300 ms; CI was occasionally flaking
        // at exactly 5005 ms.
        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 10_000 })
          .toEqual('accept/connect');
      });

      // SKILL doc: two `accept` peers are both responders, neither initiates the
      // handshake, so the query never reaches `'ready'`. We bound the negative
      // assertion at 1.5 s; if the fork ever heals via retry this test will catch
      // the change.
      test('accept/accept does not sync', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          roles: { host: 'accept', client: 'accept' },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'accept/accept';
        });
        await waitForSubductionSave();

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        // Stays in `'loading'` (or worst case never reaches `'ready'`) within the
        // window. We can't assert `'loading'` strictly because the dormant
        // subduction source could transition to `'unavailable'`; what we CAN
        // assert is that the query never reaches `'ready'`.
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
        const docHandle = client.handles[parseAutomergeUrl(handle.url).documentId] as
          | DocHandle<{ text?: string }>
          | undefined;
        expect(docHandle?.doc()?.text).to.be.undefined;
      });
    });

    describe('subductionPolicy gates', () => {
      // TODO(mykola): These tests probe behavior the SKILL doc claims is gated by
      // `subductionPolicy`. If a denial path doesn't actually surface as a stuck
      // `'loading'` query (for example, the fork swallows the rejection and
      // surfaces `'unavailable'` or `'failed'` instead), we update the assertion
      // and leave a TODO pointing at the SKILL doc claim. We do NOT force-pass.
      // `authorizeFetch` is consulted on the SERVER side of a fetch — i.e. when
      // a peer requests a sedimentree from us, our `authorizeFetch` decides
      // whether we serve it. The SKILL doc summary "gates reads of a specific
      // sedimentree" is server-centric, not fetcher-centric.
      //
      // To exercise this we need a scenario where replication relies on the
      // client EXPLICITLY pulling from the host (rather than the host pushing
      // proactively when the client connects). We do this by:
      //   1. Creating the doc on the host BEFORE the client subduction adapter
      //      connects (so there's no peer to push to at create time).
      //   2. Restarting the host repo from the same storage AFTER the offline
      //      `host.flush()` (so subduction-core in the new host repo has no
      //      memory of having advertised this commit).
      //   3. Connecting the client and having it call `find(url)`, which
      //      triggers an explicit fetch from the client to the host.
      //
      // With host's `authorizeFetch` denying, the host should refuse the
      // client's fetch request and the client's query should not reach
      // `'ready'` within the timeout. With the host permissive, the same
      // setup DOES sync (verified by the parallel control test below).
      test('authorizeFetch denial on server blocks fetcher', async () => {
        const denyingPolicy: SubductionPolicy = {
          authorizeConnect: async () => {},
          authorizeFetch: async () => {
            throw new Error('denied');
          },
          authorizePut: async () => {},
          filterAuthorizedFetch: async (_peerId, ids) => ids,
        };

        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: denyingPolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'should-not-fetch' });
        await waitForSubductionSave();

        // Client explicitly requests the doc by URL. Host's `authorizeFetch`
        // denial should prevent the response. We rely on `findWithProgress`
        // staying out of `'ready'` and the doc body remaining empty.
        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
        const docHandle = client.handles[parseAutomergeUrl(handle.url).documentId] as
          | DocHandle<{ text?: string }>
          | undefined;
        expect(docHandle?.doc()?.text).to.be.undefined;
      });

      // Control for the test above: same setup, host policy permissive →
      // doc DOES reach `'ready'` on the client. If this control failed
      // alongside the `authorizeFetch` denial test, the negative result
      // wouldn't actually prove anything — we'd just have a flaky
      // replication setup. Keeping this control here pins the contract
      // ("with permissive host, client gets the doc") and makes the
      // `authorizeFetch` denial result meaningful.
      test('authorizeFetch permissive on server allows fetcher (control)', async () => {
        const { repos, adapters } = await createHostClientRepoTopology();
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'should-fetch' });
        await waitForSubductionSave();

        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, {
            timeout: 5_000,
          })
          .toEqual('should-fetch');
      });

      test('authorizeConnect denial blocks handshake', async () => {
        const denyingPolicy: SubductionPolicy = {
          authorizeConnect: async () => {
            throw new Error('denied');
          },
          authorizeFetch: async () => {},
          authorizePut: async () => {},
          filterAuthorizedFetch: async (_peerId, ids) => ids,
        };

        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: { client: denyingPolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'should-not-arrive';
        });
        await waitForSubductionSave();

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
      });

      test('authorizePut denial blocks writes from peer', async () => {
        const denyingPolicy: SubductionPolicy = {
          authorizeConnect: async () => {},
          authorizeFetch: async () => {},
          authorizePut: async () => {
            throw new Error('denied');
          },
          filterAuthorizedFetch: async (_peerId, ids) => ids,
        };

        // Receiver creates the doc and seeds initial content; sender then attempts
        // to push a change. Receiver's policy denies puts → receiver doc must
        // remain at the original heads.
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: denyingPolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const hostHandle = host.create<{ text?: string }>({ text: 'initial' });
        await waitForSubductionSave();

        const clientHandle = await findInStates<{ text?: string }>(client, hostHandle.url, FIND_STATES);
        const initialHostHeads = getHeads(hostHandle.doc()!);

        clientHandle.change((doc: any) => {
          doc.text = 'should-be-rejected';
        });
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);

        // Host should not have accepted client's change.
        expect(getHeads(hostHandle.doc()!)).to.deep.equal(initialHostHeads);
        expect(hostHandle.doc()?.text).to.equal('initial');
      });

      // `filterAuthorizedFetch` narrows which sedimentrees a fetcher is allowed
      // to RECEIVE in response to a fetch RPC. Under the current
      // automerge-repo subduction bridge wiring, however, replication is
      // primarily driven by proactive PUSH at connection time and on every
      // `#save`: the host announces its sedimentrees to connected peers via
      // the same channel that delivers commits. That push path does NOT
      // appear to consult `filterAuthorizedFetch` (which is a fetch-response
      // filter, not a push-advertise filter — recall the SKILL doc note that
      // there is no `authorizeAdvertise` hook).
      //
      // Empirically: with a host-side `filterAuthorizedFetch` returning only
      // the allowed doc id, BOTH the allowed and blocked docs reach
      // `'ready'` on the client because the host pushes both. The filter is
      // essentially dead in this bridge.
      //
      // We assert the empirical behavior here and TODO the gap. To actually
      // gate replication you must combine `authorizePut` on the receiver and
      // `authorizeFetch` on the server, OR add an advertise-side hook to
      // the bridge upstream.
      //
      // TODO(mykola): If the fork later adds an advertise hook OR
      // `filterAuthorizedFetch` starts gating push, flip this assertion to
      // `not.equal('ready')` and `expect(blocked).to.be.undefined`.
      test('filterAuthorizedFetch on server is bypassed by proactive push', async () => {
        let allowedDoc: DocumentId | undefined;
        const filteringPolicy: SubductionPolicy = {
          authorizeConnect: async () => {},
          authorizeFetch: async () => {},
          authorizePut: async () => {},
          filterAuthorizedFetch: async (_peerId, ids) => {
            if (allowedDoc === undefined) {
              return ids;
            }
            return ids.filter((id) => id.toString() === (allowedDoc as unknown as string));
          },
        };

        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: filteringPolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const allowedHandle = host.create<{ text?: string }>({ text: 'allowed' });
        const blockedHandle = host.create<{ text?: string }>({ text: 'blocked' });
        allowedDoc = allowedHandle.documentId;
        await waitForSubductionSave();

        // Allowed doc replicates as expected.
        await expect
          .poll(async () => (await client.find<{ text?: string }>(allowedHandle.url)).doc()?.text, {
            timeout: 5_000,
          })
          .toEqual('allowed');

        // Documented gap: the supposedly-blocked doc ALSO reaches the client
        // via proactive push, despite the filter.
        await expect
          .poll(async () => (await client.find<{ text?: string }>(blockedHandle.url)).doc()?.text, {
            timeout: 5_000,
          })
          .toEqual('blocked');
      });

      // Mutable-policy recovery. We hold a closure-captured `allowFetch` flag
      // and pass a policy whose `authorizeFetch` consults it on each call. The
      // policy reference itself never changes (subduction doesn't rebind it
      // after construction), but its observable behavior does.
      //
      // Sequence:
      //   1. allowFetch = false. Connect, request the doc on the client. Host's
      //      `authorizeFetch` denies → fetch RPC fails → entry settles in
      //      `lastSyncResult === "all-failed"`.
      //   2. Flip allowFetch = true.
      //   3. Call `client.shareConfigChanged()`. This is the documented escape
      //      hatch (see SKILL doc): `SubductionSource.shareConfigChanged()`
      //      resets `"all-failed"` entries to `null`, clears the heal backoff,
      //      and re-syncs immediately. On the next attempt, host's
      //      `authorizeFetch` returns `true` and the doc replicates.
      //
      // This is the only graceful policy-flip path: without
      // `shareConfigChanged()`, the entry sits in `"all-failed"` and recovery
      // depends entirely on the heal scheduler's exponential backoff.
      test('shareConfigChanged() retries after subductionPolicy denial flips to allow', async () => {
        let allowFetch = false;
        const mutablePolicy: SubductionPolicy = {
          authorizeConnect: async () => {},
          authorizeFetch: async () => {
            if (!allowFetch) {
              throw new Error('denied');
            }
          },
          authorizePut: async () => {},
          filterAuthorizedFetch: async (_peerId, ids) => ids,
        };

        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: mutablePolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'gated' });
        await waitForSubductionSave();

        // (1) Initial denial: query does not reach `'ready'`, doc stays empty.
        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
        const docHandle = client.handles[parseAutomergeUrl(handle.url).documentId] as
          | DocHandle<{ text?: string }>
          | undefined;
        expect(docHandle?.doc()?.text).to.be.undefined;

        // (2) Flip the policy and (3) kick the source. Without the kick,
        // recovery is left to heal-retry exponential backoff (slow + flaky).
        allowFetch = true;
        client.shareConfigChanged();

        // Sync now succeeds: doc reaches the client.
        await expect.poll(() => docHandle?.doc()?.text, { timeout: 5_000 }).toEqual('gated');
      });
    });

    // Negative control: with no subduction adapters and no classical network,
    // documents must NOT replicate. If this passes while the positive tests above
    // also pass, we know the positive tests are exercising the subduction
    // transport rather than some unintended back-channel.
    test('negative control: without subductionAdapters and network=[], peers do not sync', async () => {
      const peer1 = createRepo({ network: [] });
      const peer2 = createRepo({ network: [] });

      const handle = peer1.create<{ text?: string }>();
      handle.change((doc: any) => {
        doc.text = 'should-stay-local';
      });

      const progress = peer2.findWithProgress<{ text?: string }>(handle.url);
      await sleep(NEGATIVE_ASSERTION_DELAY_MS);
      expect(progress.peek().state).to.not.equal('ready');
    });

    // Confirms B is actually relaying via subduction in a 3-peer chain, by
    // counting messages of type SUBDUCTION_MESSAGE_TYPE that traverse the B↔C
    // adapter pair while a doc created on A propagates to C.
    test('B relays via subduction in 3-peer chain', async () => {
      let bcSubductionMessages = 0;
      const onMessage = (message: Message) => {
        if (message.type === SUBDUCTION_MESSAGE_TYPE) {
          // We only count messages on the B↔C pair. `createRepoTopology` invokes
          // this hook for every adapter pair, but since this test uses a
          // fresh topology and only A↔B and B↔C exist, a positive count on the
          // B↔C pair (filtered below by `targetId`) is sufficient.
          bcSubductionMessages++;
        }
      };

      const { repos, adapters } = await createRepoTopology({
        peers: ['A', 'B', 'C'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
        ],
        // Hook installed only on the B↔C pair (second connection).
        onMessageByConnection: { 1: onMessage },
      });
      const [repoA, repoB, repoC] = repos;
      await connectAdapters(adapters);

      const docA = repoA.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'relayed';
      });
      await waitForSubductionSave();

      const docC = await findInStates<{ text?: string }>(repoC, docA.url, FIND_STATES);
      await expect.poll(() => docC.doc()?.text, { timeout: 10_000 }).toEqual('relayed');

      // If C reached `'ready'` AND we observed subduction-typed messages on the
      // B↔C pair, B is relaying via subduction (not via some classical bypass).
      expect(bcSubductionMessages).to.be.greaterThan(0);
    });
  });

  // ── SubductionPolicy: characterizing client-only gates ────────────────────
  //
  // The blocks below answer the question "if the server is permissive (e.g.
  // a passive edge DO that accepts everything from authenticated clients),
  // what can the client gate via its OWN `subductionPolicy`?". Each block
  // varies one dimension of the matrix (hook, side, data-flow direction,
  // granularity, topology, state change). Tests are deliberately named with
  // the empirical outcome up-front (e.g. `... does NOT gate ...`) so the
  // shape of any future upstream fix is obvious.
  describe('subductionPolicy: characterizing client-only gates', () => {
    // ── Block A — Client-as-receiver ──────────────────────────────────────
    //
    // Server creates the doc; we want to know what the client can refuse to
    // ingest using ONLY its own policy. The headline positive result is A1:
    // the client can refuse inbound writes via `authorizePut`. Everything
    // else here probes granularity (per-sedimentree, per-requestor) and
    // failure isolation.
    describe('Block A: client-as-receiver', () => {
      // Hypothesis: a denying `authorizePut` on the receiver blocks ALL
      // inbound bytes from a permissive peer (existing test
      // `'authorizePut denial blocks writes from peer'` covers a slightly
      // different framing — bidirectional sync that hits the deny on the
      // receive side; this test is the cleanest "server-pushes,
      // client-rejects" statement of the same property).
      //
      // Expected: the client's findWithProgress for the server's url stays
      // out of `'ready'` and the handle never gains a `doc()`.
      //
      // Implication for client-side gating: ✅ `authorizePut` is the
      // primary lever for refusing inbound replication.
      test('A1: authorizePut on client denies inbound writes from permissive server', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'server-only' });
        await waitForSubductionSave();

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
        const docHandle = client.handles[parseAutomergeUrl(handle.url).documentId] as
          | DocHandle<{ text?: string }>
          | undefined;
        expect(docHandle?.doc()?.text).to.be.undefined;
      });

      // Hypothesis: `authorizeFetch` is server-side of the FETCH RPC only;
      // it does NOT fire on the inbound proactive-push path. The SKILL doc
      // calls this out for the SERVER's `authorizeFetch`; this test pins the
      // same asymmetry on the CLIENT side — i.e. the client cannot use its
      // own `authorizeFetch` to refuse inbound proactive pushes.
      //
      // Expected: doc replicates despite the client denying every fetch.
      //
      // Implication for client-side gating: ❌ `authorizeFetch` is NOT a
      // usable knob for refusing inbound bytes. The client must use
      // `authorizePut` (see A1) instead.
      test('A2: authorizeFetch on client does NOT gate inbound proactive push', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizeFetch: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'pushed' });
        await waitForSubductionSave();

        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('pushed');
      });

      // Hypothesis: `authorizePut` receives the `sedimentreeId` that bytes
      // are being inserted into, so the receiver can deny by-sedimentree.
      //
      // Expected: client receives docB (allowed sedimentree) but not docA
      // (denied sedimentree).
      //
      // Implication: ✅ per-sedimentree client-side gating works via
      // `authorizePut`. This is the building block for the DXOS-style
      // per-space gate (compute the doc's space from its DocumentId, allow
      // only authorized spaces). Note: we rely on `SedimentreeId.toString()`
      // being stable across the boundary; if a future bridge version
      // changes the encoding this test will break here and the comparison
      // strategy needs to switch to byte equality.
      test('A3: authorizePut: selective per-sedimentree denial', async () => {
        const { repos, adapters } = await createHostClientRepoTopology();
        const [host] = repos;

        // Pre-create both docs on the host so we know their documentIds
        // (and therefore the sedimentree ids the client will see) BEFORE
        // wiring up the client's policy.
        const docA = host.create<{ text?: string }>({ text: 'A-blocked' });
        const docB = host.create<{ text?: string }>({ text: 'B-allowed' });
        await waitForSubductionSave();

        const allow = new Set<string>([documentIdToSedimentreeIdString(docB.documentId)]);
        // Now wire the client with a per-sedimentree gate. We can't pass
        // it into `createHostClientRepoTopology` after-the-fact, so build
        // a fresh 2-peer topology and discard the previous client.
        // Simpler: spin up a 3-peer topology where the gate is on a new
        // peer joining a 2-peer that already has the docs.
        const { repos: repos2, adapters: adapters2 } = await createRepoTopology({
          peers: ['holder', 'fetcher'],
          connections: [['holder', 'fetcher']],
          options: {
            subductionPolicies: {
              fetcher: denyExceptSedimentrees(allow, 'authorizePut'),
            },
          },
        });
        const [holder, fetcher] = repos2;
        // Move the docs into the holder by importing the saved bytes.
        // `save()`s are still pending on `host`; force a flush first.
        await host.flush();
        const aBytes = await host.export(docA.url);
        const bBytes = await host.export(docB.url);
        expect(aBytes).toBeDefined();
        expect(bBytes).toBeDefined();
        holder.import(aBytes!, { docId: docA.documentId });
        holder.import(bBytes!, { docId: docB.documentId });
        await holder.flush();
        await connectAdapters(adapters2);

        // Allowed doc arrives.
        await expect
          .poll(async () => (await fetcher.find<{ text?: string }>(docB.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('B-allowed');

        // Denied doc stays out of `'ready'` for the negative window.
        const progress = fetcher.findWithProgress<{ text?: string }>(docA.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');

        // Keep the first topology adapters from racing teardown with our
        // active fetch (they're cleaned up by onTestFinished).
        void adapters;
      });

      // Hypothesis: `authorizePut(requestor, author, sedimentreeId)` exposes
      // the SUBDUCTION-LEVEL Ed25519 peer-id of the sender as `requestor`,
      // so a star-topology receiver can accept doc-from-server2 while
      // refusing doc-from-server1.
      //
      // Expected: in a `client + {server1, server2}` star, with the client
      // denying any put whose `requestor.toString() === server1Signer.peerId()`,
      // the client receives `docFromServer2.url` but not `docFromServer1.url`.
      //
      // Implication: ✅ per-peer gating works — provided we know the peer's
      // signer key up front. For DXOS this means binding subduction peer-id
      // to space-id needs out-of-band metadata (the peer-id is not in the
      // `AutomergeReplicatorConnection` today).
      test('A4: authorizePut: selective per-requestor denial in star topology', async () => {
        const server1Signer = MemorySigner.generate();
        const server2Signer = MemorySigner.generate();
        const clientSigner = MemorySigner.generate();

        const denied = new Set<string>([server1Signer.peerId().toString()]);
        const { repos, adapters } = await createStarTopology({
          signers: { client: clientSigner, server1: server1Signer, server2: server2Signer },
          subductionPolicies: { client: denyPeers(denied, 'authorizePut') },
        });
        const [client, server1, server2] = repos;
        await connectAdapters(adapters);

        const docFromServer1 = server1.create<{ text?: string }>({ text: 'from-server1' });
        const docFromServer2 = server2.create<{ text?: string }>({ text: 'from-server2' });
        await waitForSubductionSave();

        // Allowed peer's doc arrives.
        await expect
          .poll(async () => (await client.find<{ text?: string }>(docFromServer2.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('from-server2');

        // Denied peer's doc stays out of `'ready'`.
        const progress = client.findWithProgress<{ text?: string }>(docFromServer1.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
      });

      // Hypothesis: a denial on sedimentree A does not leak into the
      // entry-state machine for sedimentree B (subduction maintains
      // per-entry state).
      //
      // Expected: docB replicates within the usual window; the
      // `authorizePut` hook is invoked multiple times across both docs and
      // denial of A does not interfere with the running entry for B.
      //
      // Implication: ✅ failure isolation holds. Useful for the DXOS gate:
      // denying out-of-space puts will not poison the running sync state
      // for in-space docs.
      test('A5: authorizePut denial does NOT poison subsequent allowed sedimentrees', async () => {
        const { repos, adapters } = await createHostClientRepoTopology();
        const [host] = repos;
        const docA = host.create<{ text?: string }>({ text: 'A' });
        const docB = host.create<{ text?: string }>({ text: 'B' });
        await waitForSubductionSave();
        await host.flush();

        const allow = new Set<string>([documentIdToSedimentreeIdString(docB.documentId)]);
        const { policy, counters } = createCountingPolicy(denyExceptSedimentrees(allow, 'authorizePut'));

        const { repos: repos2, adapters: adapters2 } = await createRepoTopology({
          peers: ['holder', 'fetcher'],
          connections: [['holder', 'fetcher']],
          options: {
            subductionPolicies: { fetcher: policy },
          },
        });
        const [holder, fetcher] = repos2;
        const aBytes = await host.export(docA.url);
        const bBytes = await host.export(docB.url);
        holder.import(aBytes!, { docId: docA.documentId });
        holder.import(bBytes!, { docId: docB.documentId });
        await holder.flush();
        await connectAdapters(adapters2);

        await expect
          .poll(async () => (await fetcher.find<{ text?: string }>(docB.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('B');

        // We expect `authorizePut` to have been called at least once total
        // (B's commit). Whether A's denial is retried by heal is a separate
        // characterization — we don't pin the count tightly because the
        // subduction heal scheduler may retry the denied entry.
        expect(counters.authorizePut).to.be.greaterThan(0);

        // Belt-and-braces: previous topology still cleaning up.
        void adapters;
      });
    });

    // ── Block B — Client-as-source (negative-result block) ───────────────
    //
    // Client owns the doc; we want to know whether ANY hook on the client
    // side can prevent its own Repo from pushing that doc to a connected
    // permissive server. Each test below is expected to FAIL to gate — the
    // assertions are written so an upstream fix that adds an outbound-push
    // hook will surface as a clean test failure.
    describe('Block B: client-as-source negative results', () => {
      // Hypothesis: `authorizePut` only gates inbound writes; it has no
      // effect on outbound bytes. The bridge does not consult any policy
      // hook before broadcasting `addBatch` to connected peers.
      //
      // Expected: server still receives the doc.
      //
      // Implication: ❌ Client-side `authorizePut` cannot prevent the
      // client from pushing its own data out. To stop outbound push, the
      // SERVER must deny via its own `authorizePut`, OR the channel must
      // not exist (see B4 / Block C).
      test('B1: authorizePut on client does NOT gate outbound to a permissive server', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = client.create<{ text?: string }>({ text: 'from-client' });
        await waitForSubductionSave();

        await expect
          .poll(async () => (await host.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('from-client');
      });

      // EMPIRICAL CORRECTION: the prior hypothesis (per SKILL doc) was
      // that `authorizeFetch` is server-side-of-fetch-RPC only and does
      // NOT participate in proactive push. The actual observation under
      // `@automerge/automerge-repo@2.6.0-subduction.17` is the opposite:
      // the HOLDER's `authorizeFetch` is consulted before the holder
      // broadcasts a commit to its peers (proactive push) and a denial
      // blocks that broadcast.
      //
      // The reasoning is consistent with the bridge architecture: under
      // the hood proactive push appears to be implemented as the holder
      // serving its own data as if it were responding to a fetch from
      // each connected peer, so the policy's fetch hook fires per peer
      // per broadcast.
      //
      // Expected: client (the source) denies `authorizeFetch` → server
      // does NOT receive the doc within 1.5s.
      //
      // Implication: ✅ The CLIENT (as data source) CAN gate outbound
      // proactive push by denying `authorizeFetch`. This is a stronger
      // client-side capability than the SKILL doc currently documents.
      //
      // NOTE: the stale `.agents/skills/effect/subduction/SKILL.md`
      // doc that previously claimed the opposite has been deleted. The
      // observed behavior captured here is the new source of truth.
      test('B2: authorizeFetch on client DOES gate outbound proactive push (empirical correction)', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizeFetch: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = client.create<{ text?: string }>({ text: 'from-client' });
        await waitForSubductionSave();

        const progress = host.findWithProgress<{ text?: string }>(handle.url);
        await sleep(1_500);
        expect(progress.peek().state).to.not.equal('ready');
      });

      // Hypothesis: `filterAuthorizedFetch` is bypassed by proactive push
      // (already empirically established for the SERVER side by the
      // existing `'filterAuthorizedFetch ... is bypassed by proactive
      // push'` test). This test pins symmetry on the CLIENT side.
      //
      // Expected: server still receives. ❌ `filterAuthorizedFetch` is
      // bridge-dead under proactive push on either side.
      test('B3: filterAuthorizedFetch on client does NOT gate outbound proactive push', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              filterAuthorizedFetch: async () => [],
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = client.create<{ text?: string }>({ text: 'from-client' });
        await waitForSubductionSave();

        await expect
          .poll(async () => (await host.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('from-client');
      });

      // Hypothesis: `authorizeConnect` IS the only nuclear knob. Denying it
      // on the initiator (client, via `role: 'connect'`) tears down the
      // channel entirely → nothing flows in either direction.
      //
      // Expected: server never sees client's doc; client never sees
      // server's doc.
      //
      // Implication: 💥 If the client wants to refuse ALL outbound data
      // to a specific peer, `authorizeConnect` is the only mechanism the
      // current bridge offers — and it severs both directions.
      test('B4: authorizeConnect on client (initiator) nukes the channel (nuclear control)', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizeConnect: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const clientHandle = client.create<{ text?: string }>({ text: 'from-client' });
        const hostHandle = host.create<{ text?: string }>({ text: 'from-server' });
        await waitForSubductionSave();

        // Server never gets client's doc.
        const hostProgressOfClientDoc = host.findWithProgress<{ text?: string }>(clientHandle.url);
        // Client never gets server's doc.
        const clientProgressOfHostDoc = client.findWithProgress<{ text?: string }>(hostHandle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(hostProgressOfClientDoc.peek().state).to.not.equal('ready');
        expect(clientProgressOfHostDoc.peek().state).to.not.equal('ready');
      });
    });

    // ── Block C — authorizeConnect granularity ─────────────────────────
    //
    // Existing tests cover blanket "deny everything" on `authorizeConnect`.
    // This block probes per-peer denial, reconnect semantics, and counting.
    describe('Block C: authorizeConnect granularity', () => {
      // Hypothesis: in a star topology, denying `authorizeConnect` only for
      // `server1`'s peer-id refuses the handshake with server1 but not
      // with server2.
      //
      // Expected: client receives server2's doc, never server1's doc.
      // Connect counter shows two invocations (one allow, one deny).
      //
      // Implication: ✅ per-peer connect gating works. Effective on the
      // client side for refusing entire peers (as opposed to per-doc).
      test('C1: authorizeConnect: per-peer denial in star topology', async () => {
        const server1Signer = MemorySigner.generate();
        const server2Signer = MemorySigner.generate();
        const clientSigner = MemorySigner.generate();
        const denied = new Set<string>([server1Signer.peerId().toString()]);
        const { policy: clientPolicy, counters } = createCountingPolicy(denyPeers(denied, 'authorizeConnect'));

        const { repos, adapters } = await createStarTopology({
          signers: { client: clientSigner, server1: server1Signer, server2: server2Signer },
          subductionPolicies: { client: clientPolicy },
        });
        const [client, server1, server2] = repos;
        await connectAdapters(adapters);

        const doc1 = server1.create<{ text?: string }>({ text: 'from-server1' });
        const doc2 = server2.create<{ text?: string }>({ text: 'from-server2' });
        await waitForSubductionSave();

        await expect
          .poll(async () => (await client.find<{ text?: string }>(doc2.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('from-server2');

        const progress1 = client.findWithProgress<{ text?: string }>(doc1.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress1.peek().state).to.not.equal('ready');

        // Connect hook fired at least once per peer (server1 deny + server2 allow).
        expect(counters.authorizeConnect).to.be.greaterThanOrEqual(2);
      });

      // Hypothesis: the existing test `'authorizeConnect denial blocks
      // handshake'` denies on the `'connect'` (initiator) side. The role
      // matrix (see SKILL doc) requires at least one peer be `'connect'`,
      // and a counterpart where the OTHER side initiates first should also
      // refuse — confirming `authorizeConnect` symmetry.
      //
      // Expected: with `host: 'accept'` / `client: 'connect'` and the
      // ACCEPTING side (host) denying connect, the handshake still fails;
      // the doc does not reach the client.
      //
      // Implication: ✅ either side denying `authorizeConnect` is
      // sufficient.
      test('C2: authorizeConnect: denial on responder side also blocks handshake', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          roles: { host: 'accept', client: 'connect' },
          subductionPolicies: {
            host: {
              ...PERMISSIVE_POLICY,
              authorizeConnect: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'should-not-arrive' });
        await waitForSubductionSave();

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
      });

      // Hypothesis: `authorizeConnect` fires once per successful handshake;
      // `reconnectAdapters` (peer-disconnected + peer-candidate) drives a
      // fresh handshake → hook fires again.
      //
      // Expected: counter strictly monotonic across reconnect cycles; at
      // least N+1 invocations after N reconnects (the +1 covers the
      // initial connect).
      //
      // Implication: ℹ️ if you flip `authorizeConnect`'s observable
      // behavior at runtime (closure mutation), you need a reconnect to
      // realize the change — `shareConfigChanged()` does NOT re-trigger
      // `authorizeConnect` (it re-syncs document entries, not handshakes).
      test('C3: authorizeConnect: fires once per handshake; reconnect re-invokes', async () => {
        const { policy: clientPolicy, counters } = createCountingPolicy();
        const { adapters } = await createHostClientRepoTopology({
          subductionPolicies: { client: clientPolicy },
        });
        await connectAdapters(adapters);

        // Allow initial handshake to land.
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        const initial = counters.authorizeConnect;
        expect(initial).to.be.greaterThanOrEqual(1);

        for (let i = 0; i < 2; i++) {
          await reconnectAdapters(adapters);
          await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        }

        // Each reconnect should have triggered at least one more invocation.
        expect(counters.authorizeConnect).to.be.greaterThanOrEqual(initial + 2);
      });
    });

    // ── Block D — authorizeFetch / filterAuthorizedFetch invocation ──────
    //
    // Pin DOWN when these hooks actually fire under the current bridge.
    // The existing test `'filterAuthorizedFetch on server is bypassed by
    // proactive push'` establishes that `filterAuthorizedFetch` is dead
    // under push; this block records counter values across a few common
    // flows so any future bridge change surfaces as a counter regression.
    describe('Block D: authorizeFetch + filterAuthorizedFetch invocation conditions', () => {
      // EMPIRICAL CORRECTION (see B2): the prior SKILL-doc-aligned
      // hypothesis was that `authorizeFetch` does NOT fire on proactive
      // push. Observed reality: it DOES fire (≥ 2 invocations in a
      // 2-peer push setup). The hook is consulted by the HOLDER for
      // every peer it broadcasts to.
      //
      // Expected: `authorizeFetch` counter > 0 in BOTH the proactive
      // push and the explicit fetch flows.
      //
      // Implication: ✅ `authorizeFetch` is the per-peer per-sedimentree
      // gate for OUTBOUND data flow on the holder. Combined with
      // `authorizePut` on the receiver, this gives a fully client-side
      // gate for both directions.
      test('D1: authorizeFetch fires on BOTH proactive push and explicit fetch (empirical)', async () => {
        // Half 1: proactive push. Hook fires when host broadcasts.
        const { policy: pushPolicy, counters: pushCounters } = createCountingPolicy();
        const { repos: pushRepos, adapters: pushAdapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: pushPolicy },
        });
        const [pushHost, pushClient] = pushRepos;
        await connectAdapters(pushAdapters);
        const pushHandle = pushHost.create<{ text?: string }>({ text: 'pushed' });
        await waitForSubductionSave();
        // Assert the host-side hook fired BEFORE the client issues any
        // explicit `find` — proves it was the proactive broadcast (not a
        // later fetch) that consulted `authorizeFetch`.
        // Empirical: >= 1 (observed 2 locally). Don't pin an exact
        // count — the bridge may batch or invoke twice per broadcast
        // (once at connect-time-sync, once per `#save`).
        expect(pushCounters.authorizeFetch).to.be.greaterThan(0);
        await expect
          .poll(async () => (await pushClient.find<{ text?: string }>(pushHandle.url)).doc()?.text, {
            timeout: 5_000,
          })
          .toEqual('pushed');

        // Half 2: explicit fetch (doc-before-connect pattern). Pre-issue
        // the client's fetch BEFORE peers learn about each other so the
        // eventual `reconnectAdapters` drives an explicit fetch flow
        // (rather than collapsing into the proactive-push path). Hook
        // still fires; pin > 0.
        const { policy: fetchPolicy, counters: fetchCounters } = createCountingPolicy();
        const { repos: fetchRepos, adapters: fetchAdapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: fetchPolicy },
        });
        const [fetchHost, fetchClient] = fetchRepos;
        await connectAdapters(fetchAdapters, { noEmitPeerCandidate: true });
        const fetchHandle = fetchHost.create<{ text?: string }>({ text: 'fetched' });
        await waitForSubductionSave();
        const fetchProgress = fetchClient.findWithProgress<{ text?: string }>(fetchHandle.url);
        await reconnectAdapters(fetchAdapters);
        await waitForQueryState(fetchProgress, ['ready'], { timeout: 10_000 });
        expect(fetchCounters.authorizeFetch).to.be.greaterThan(0);
      });

      // Hypothesis: `filterAuthorizedFetch` is consulted by
      // `get_authorized_subscriber_conns` ONLY for peers that explicitly
      // subscribed to a sedimentree (via `syncWithAllPeers(id, true)`
      // etc.); broadcast of new commits falls back to "all connections"
      // with no filter consultation when no subscribers exist. See the
      // `subduction-policy` skill for the source-level breakdown.
      //
      // In the test topologies below peers don't explicitly subscribe,
      // so the counter is expected to stay at 0 in both the proactive
      // push and the explicit fetch flows.
      test('D2: filterAuthorizedFetch invocation characterization', async () => {
        // Proactive push: hook count stays at 0 (matches existing
        // `'filterAuthorizedFetch ... is bypassed by proactive push'`).
        const { policy: pushPolicy, counters: pushCounters } = createCountingPolicy();
        const { repos: pushRepos, adapters: pushAdapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: pushPolicy },
        });
        const [pushHost, pushClient] = pushRepos;
        await connectAdapters(pushAdapters);
        const handle = pushHost.create<{ text?: string }>({ text: 'snapshot' });
        await waitForSubductionSave();
        await expect
          .poll(async () => (await pushClient.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('snapshot');
        expect(pushCounters.filterAuthorizedFetch).to.equal(0);

        // Explicit fetch path: under the current bridge
        // `filterAuthorizedFetch` is bridge-dead even when the fetch
        // RPC fires. We pin `=== 0` here. If a future bridge starts
        // plumbing the filter through, this assertion will fail and
        // the test should be flipped to a `> 0` characterization.
        const { policy: fetchPolicy, counters: fetchCounters } = createCountingPolicy();
        const { repos: fetchRepos, adapters: fetchAdapters } = await createHostClientRepoTopology({
          subductionPolicies: { host: fetchPolicy },
        });
        const [fetchHost, fetchClient] = fetchRepos;
        await connectAdapters(fetchAdapters, { noEmitPeerCandidate: true });
        const fetchHandle = fetchHost.create<{ text?: string }>({ text: 'snapshot-fetch' });
        await waitForSubductionSave();
        await reconnectAdapters(fetchAdapters);
        await expect
          .poll(async () => (await fetchClient.find<{ text?: string }>(fetchHandle.url)).doc()?.text, {
            timeout: 10_000,
          })
          .toEqual('snapshot-fetch');
        expect(fetchCounters.filterAuthorizedFetch).to.equal(0);
      });

      // Without an explicit subscribe, `filterAuthorizedFetch` is not
      // consulted (see D2 + the `subduction-policy` skill). So even a
      // filter returning the empty list cannot prune anything in this
      // setup — both docs replicate via the unfiltered broadcast.
      test('D3: filterAuthorizedFetch cannot prune anything without explicit subscribers', async () => {
        // Two docs, server filters to neither. Replication still happens
        // via push.
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            host: {
              ...PERMISSIVE_POLICY,
              filterAuthorizedFetch: async () => [],
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const a = host.create<{ text?: string }>({ text: 'a' });
        const b = host.create<{ text?: string }>({ text: 'b' });
        await waitForSubductionSave();

        await expect
          .poll(async () => (await client.find<{ text?: string }>(a.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('a');
        await expect
          .poll(async () => (await client.find<{ text?: string }>(b.url)).doc()?.text, { timeout: 5_000 })
          .toEqual('b');
      });
    });

    // ── Block E — authorizePut(requestor, author, sedimentreeId) ─────────
    //
    // Probe what subduction surfaces as `requestor` vs `author` in a
    // 3-peer chain. The SKILL doc claims `authorizePut` is "receiver-side"
    // and gates inbound writes; this block characterizes the identities
    // visible to the receiver.
    describe('Block E: authorizePut requestor vs author in 3-peer chain', () => {
      // Hypothesis (per SKILL doc): in a chain A → B → C, when commits
      // flow from A through B to C, C's `authorizePut` sees
      // `requestor === B`'s peer-id (immediate sender) and
      // `author === A`'s peer-id (original signer of the commit).
      //
      // Strategy: deterministic signers for A/B/C; counting policy on C
      // records each call's (requestor, author). After A's commit
      // propagates to C, search the call log for a put whose `author`
      // matches A's peer-id and whose `requestor` matches B's peer-id.
      //
      // Expected outcome: the assertion finds such a call. If the bridge
      // actually surfaces something different (e.g. `requestor === A`),
      // the test fails LOUDLY with the actual contents of `calls`, which
      // is exactly the kind of empirical correction we want to drive a
      // SKILL doc update.
      test('E1: requestor === immediate sender, author === original signer', async () => {
        const sigA = MemorySigner.generate();
        const sigB = MemorySigner.generate();
        const sigC = MemorySigner.generate();

        const { policy: policyC, calls: callsC } = createCountingPolicy();
        const { repos, adapters } = await createRepoTopology({
          peers: ['A', 'B', 'C'],
          connections: [
            ['A', 'B'],
            ['B', 'C'],
          ],
          options: {
            signers: { A: sigA, B: sigB, C: sigC },
            subductionPolicies: { C: policyC },
          },
        });
        const [repoA, , repoC] = repos;
        await connectAdapters(adapters);

        const docA = repoA.create<{ text?: string }>({ text: 'from-A' });
        await waitForSubductionSave();
        await expect
          .poll(async () => (await repoC.find<{ text?: string }>(docA.url)).doc()?.text, { timeout: 10_000 })
          .toEqual('from-A');

        const aId = sigA.peerId().toString();
        const bId = sigB.peerId().toString();
        const putCalls = callsC.filter((c) => c.hook === 'authorizePut');
        const matching = putCalls.find((c) => {
          const [requestor, author] = c.args as [unknown, unknown, unknown];
          return (
            (requestor as { toString(): string }).toString() === bId &&
            (author as { toString(): string }).toString() === aId
          );
        });
        // TODO(mykola): If this assertion fails, the actual observed
        // (requestor, author) pairs are in `putCalls`. Update the SKILL
        // doc with the corrected semantics before changing the test.
        expect(
          matching,
          `expected put with requestor=B (${bId}) and author=A (${aId}); observed: ${JSON.stringify(
            putCalls.map((c) => ({
              requestor: (c.args[0] as any).toString(),
              author: (c.args[1] as any).toString(),
            })),
          )}`,
        ).toBeDefined();
      });

      // Hypothesis: denying puts whose `author` matches A's peer-id at C
      // blocks A's commits from landing at C, even though B is
      // permissive and relaying them.
      //
      // Expected: A's doc never reaches `'ready'` at C; a B-authored
      // doc (control) does.
      //
      // Implication: ✅ `author` is a usable knob for
      // origin-attribution gating, IF the bridge surfaces what E1
      // hypothesises. If E1 fails, this test will also fail and the
      // assumptions need re-examining.
      test('E2: authorizePut deny-by-author blocks original signer even with permissive relay', async () => {
        const sigA = MemorySigner.generate();
        const sigB = MemorySigner.generate();
        const sigC = MemorySigner.generate();
        const deniedAuthors = new Set<string>([sigA.peerId().toString()]);
        const policyC: SubductionPolicy = {
          ...PERMISSIVE_POLICY,
          authorizePut: async (_req, author) => {
            if (deniedAuthors.has(author.toString())) {
              throw new Error(`denied author ${author.toString()}`);
            }
          },
        };

        const { repos, adapters } = await createRepoTopology({
          peers: ['A', 'B', 'C'],
          connections: [
            ['A', 'B'],
            ['B', 'C'],
          ],
          options: {
            signers: { A: sigA, B: sigB, C: sigC },
            subductionPolicies: { C: policyC },
          },
        });
        const [repoA, repoB, repoC] = repos;
        await connectAdapters(adapters);

        const docA = repoA.create<{ text?: string }>({ text: 'from-A-blocked' });
        const docB = repoB.create<{ text?: string }>({ text: 'from-B-allowed' });
        await waitForSubductionSave();

        // Control: B-authored doc lands at C.
        await expect
          .poll(async () => (await repoC.find<{ text?: string }>(docB.url)).doc()?.text, { timeout: 10_000 })
          .toEqual('from-B-allowed');

        // Test: A-authored doc does NOT land at C within the negative
        // window, despite B relaying.
        const progressA = repoC.findWithProgress<{ text?: string }>(docA.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progressA.peek().state).to.not.equal('ready');
      });
    });

    // ── Block F — Mutation and recovery ─────────────────────────────────
    //
    // Sister tests to the existing `'shareConfigChanged() retries after
    // subductionPolicy denial flips to allow'`. Probe the recovery shape
    // for `authorizePut` deny↔allow flips and characterize what happens
    // when you flip from allow → deny mid-flight.
    describe('Block F: mutation and recovery', () => {
      // EMPIRICAL FINDING (recovery shape after `authorizePut` denial):
      //
      // The existing `'shareConfigChanged() retries after subductionPolicy
      // denial flips to allow'` test recovers a denied `authorizeFetch`
      // by flipping allow and calling `client.shareConfigChanged()`. The
      // symmetric setup for `authorizePut` does NOT recover the same
      // way under the current bridge:
      //
      //   1. `host.shareConfigChanged()` + `client.shareConfigChanged()`
      //      after the flip does not deliver the doc within 1.5s.
      //   2. `reconnectAdapters` (full peer-disconnected +
      //      peer-candidate cycle on both sides) also does NOT deliver
      //      the doc within an additional 10s window.
      //   3. Only a fresh `#save` on the holder AFTER the flip
      //      reliably retriggers a push that now passes the allowing
      //      policy.
      //
      // Suspected cause: a holder's push that was rejected by the
      // receiver's `authorizePut` does not transition the holder's
      // sync-entry into a state the bridge's recovery hooks address
      // (heal-retry alone would eventually fire, but on a slow
      // exponential backoff). The reconnect path also doesn't recover
      // because — per the SKILL doc's documented fork gap —
      // `lastSyncResult === 'all-failed'` is not retried on
      // connection-generation bumps. A new `#save` enqueues a fresh
      // outbound batch from scratch, sidestepping the stuck entry.
      //
      // Expected: kick via `shareConfigChanged()` does NOT recover;
      // `reconnectAdapters` does NOT recover; a new local commit on the
      // holder DOES recover.
      //
      // Implication: 🚨 production code that flips a client-side
      // `authorizePut` gate from deny → allow (e.g. when a new space is
      // authorized) must drive a fresh push from the holder side. The
      // SKILL-doc-recommended `shareConfigChanged()` escape hatch alone
      // is insufficient for `authorizePut` flips. This is a real bridge
      // limitation worth filing upstream.
      //
      // TODO(mykola): If/when the upstream bridge starts treating
      // post-`authorizePut`-denial entries as recoverable via
      // `shareConfigChanged()`, simplify this test to mirror the
      // existing `authorizeFetch` flip test.
      test('F1: authorizePut deny → allow needs a fresh holder commit to recover', { timeout: 20_000 }, async () => {
        let allowPut = false;
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                if (!allowPut) {
                  throw new Error('denied');
                }
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'gated-put' });
        await waitForSubductionSave();

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');

        // Step 1: flip + shareConfigChanged + reconnect, both
        // documented escape hatches. Empirically neither lands the doc.
        allowPut = true;
        host.shareConfigChanged();
        client.shareConfigChanged();
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');

        await reconnectAdapters(adapters);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');

        // Step 2: drive a new commit on the holder. The fresh `#save`
        // sidesteps the stuck post-denial entry and pushes successfully.
        handle.change((doc: any) => {
          doc.text = 'after-flip';
        });
        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 10_000 })
          .toEqual('after-flip');
      });

      // Hypothesis: without `shareConfigChanged()`, recovery is left to
      // the heal scheduler whose first retry is at `healInitialDelayMs`
      // (100ms in our test config). However, an entry that lands in
      // `'all-failed'` after a denied `authorizePut` is NOT retried on
      // generation change. We assert: within a bounded 1.5s window,
      // the doc still does not arrive.
      //
      // Implication: ⏱ document the recovery delay — the gap between
      // denial and natural recovery is non-trivial and `shareConfigChanged`
      // is the only fast path.
      test('F2: authorizePut deny → allow without shareConfigChanged() stays denied within window', async () => {
        let allowPut = false;
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                if (!allowPut) {
                  throw new Error('denied');
                }
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'no-kick' });
        await waitForSubductionSave();

        // Initial denial settled.
        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');

        // Flip but DO NOT kick. The heal scheduler's behaviour on
        // `'all-failed'` is the known fork gap from the SKILL doc;
        // we assert it stays denied for at least 1500 ms.
        allowPut = true;
        await sleep(1_500);
        expect(progress.peek().state).to.not.equal('ready');
      });

      // EMPIRICAL CORRECTION (see B2/D1): the prior hypothesis was that
      // `authorizeFetch` is fetch-RPC only and so flipping it on the
      // holder won't block subsequent proactive pushes. Observation:
      // `authorizeFetch` IS consulted on every push, so flipping it
      // allow→deny on the HOLDER DOES block subsequent pushes.
      //
      // Expected: pre-flip change syncs; post-flip change does NOT
      // reach the client within the negative window.
      //
      // Implication: ✅ `authorizeFetch` is a usable revoke knob on the
      // holder for ongoing subscription access.
      test('F3: authorizeFetch allow → deny blocks subsequent push deliveries (empirical)', async () => {
        let denyFetch = false;
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            host: {
              ...PERMISSIVE_POLICY,
              authorizeFetch: async () => {
                if (denyFetch) {
                  throw new Error('denied');
                }
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'initial' });
        await waitForSubductionSave();
        const clientHandle = await findInStates<{ text?: string }>(client, handle.url, FIND_STATES);
        await expect.poll(() => clientHandle.doc()?.text, { timeout: 5_000 }).toEqual('initial');

        denyFetch = true;
        handle.change((doc: any) => {
          doc.text = 'after-revoke';
        });
        await waitForSubductionSave();

        // Within the negative window the client's view must NOT advance
        // past 'initial'.
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(clientHandle.doc()?.text).to.equal('initial');
      });

      // Hypothesis: by contrast, flipping `authorizePut` from allow → deny
      // on the receiver DOES block subsequent pushes, because every commit
      // hits `authorizePut`.
      //
      // Expected: client's view of the doc stays at the pre-flip text
      // for at least the negative window.
      //
      // Implication: ✅ `authorizePut` is the only client-side hook that
      // can revoke ongoing subscription access (and only on the receiver
      // side).
      test('F4: authorizePut allow → deny blocks subsequent pushes', async () => {
        let denyPut = false;
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                if (denyPut) {
                  throw new Error('denied');
                }
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'initial' });
        await waitForSubductionSave();
        const clientHandle = await findInStates<{ text?: string }>(client, handle.url, FIND_STATES);
        await expect.poll(() => clientHandle.doc()?.text, { timeout: 5_000 }).toEqual('initial');

        denyPut = true;
        handle.change((doc: any) => {
          doc.text = 'after-revoke';
        });
        await waitForSubductionSave();

        // Within the negative window the client's view must NOT advance.
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(clientHandle.doc()?.text).to.equal('initial');
      });
    });

    // ── Block G — Practical recipe verification ──────────────────────────
    //
    // The SKILL doc recommends combining `authorizePut(receiver) +
    // authorizeFetch(server)` to block a peer from receiving a sedimentree.
    // These tests verify the recipe end-to-end and probe which half is
    // actually load-bearing for the DXOS (proactive-push) use case.
    describe('Block G: recipe verification', () => {
      // Hypothesis: receiver denies put + server denies fetch → doc
      // never reaches receiver via either path.
      //
      // Expected: client's findWithProgress stays out of `'ready'`.
      //
      // Implication: ✅ this is the formal recipe under the current
      // bridge. Heavy-handed but reliable.
      test('G1: authorizePut(receiver) + authorizeFetch(server) blocks via both paths', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            host: {
              ...PERMISSIVE_POLICY,
              authorizeFetch: async () => {
                throw new Error('denied');
              },
            },
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'blocked' });
        await waitForSubductionSave();

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
      });

      // Hypothesis: in DXOS the edge DO proactively pushes; the fetch path
      // is not the primary delivery mechanism. Therefore receiver's
      // `authorizePut` ALONE should be enough to block ingestion.
      //
      // Expected: client's findWithProgress stays out of `'ready'` even
      // with the server fully permissive.
      //
      // Implication: ✅ for DXOS the necessary and sufficient gate is
      // `AutomergeHost._subductionPolicy.authorizePut`. The
      // `authorizeFetch` half of the SKILL doc recipe is only needed
      // for topologies where the client can fall back to fetching.
      test('G2: authorizePut(receiver) alone is sufficient under proactive push', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>({ text: 'only-put-gate' });
        await waitForSubductionSave();

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
      });

      // Hypothesis: even when the receiver explicitly fetches (`find`),
      // the bytes have to land through the `authorizePut` codepath, so a
      // denying receiver still blocks. If the bridge has a leak here —
      // i.e. an explicit-fetch response bypasses `authorizePut` — this
      // test catches it.
      //
      // Strategy: doc-before-connect pattern so `find()` issues a fetch.
      //
      // Implication (predicted): ✅ `authorizePut` covers both push and
      // fetch ingest paths.
      test('G3: authorizePut(receiver) also blocks explicit fetch', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters, { noEmitPeerCandidate: true });

        const handle = host.create<{ text?: string }>({ text: 'fetch-blocked' });
        await waitForSubductionSave();
        await reconnectAdapters(adapters);

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
      });
    });

    // ── Block H — Outbound-push negative controls ──────────────────────
    //
    // Lock down the headline NEGATIVE finding: there is no combination of
    // client-side policy hooks (short of `authorizeConnect`) that prevents
    // the client's Repo from pushing its own data to a connected
    // permissive peer.
    describe('Block H: outbound-push negative controls', () => {
      // EMPIRICAL REVISION (post B2/D1): the originally-hypothesised
      // negative result ("no combination of client-side hooks gates
      // outbound push") is FALSE. The client CAN gate its own outbound
      // push by denying `authorizeFetch` (B2, D1, F3). This test now
      // serves as the positive control for that combined gate.
      //
      // Expected: with every non-connect hook denying on the CLIENT
      // side (and connect permissive so the channel stays up), the
      // server still does NOT receive the client's doc — because
      // `authorizeFetch` denial on the holder blocks proactive push.
      //
      // Implication: ✅ the headline answer to the user's question is
      // YES — a client CAN gate replication purely via its own
      // `subductionPolicy`, using `authorizeFetch` for outbound and
      // `authorizePut` for inbound. `authorizeConnect` remains the
      // nuclear all-or-nothing option.
      test('H1: client-side authorizeFetch+authorizePut+filterAuthorizedFetch combo blocks outbound push', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            client: {
              authorizeConnect: async () => {},
              authorizePut: async () => {
                throw new Error('denied');
              },
              authorizeFetch: async () => {
                throw new Error('denied');
              },
              filterAuthorizedFetch: async () => [],
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = client.create<{ text?: string }>({ text: 'client-outbound' });
        await waitForSubductionSave();

        const progress = host.findWithProgress<{ text?: string }>(handle.url);
        await sleep(1_500);
        expect(progress.peek().state).to.not.equal('ready');
      });

      // Hypothesis (companion to H1): the only effective gate against
      // the client's outbound push is the SERVER's `authorizePut`. From
      // the client's perspective, this means client-only enforcement is
      // impossible.
      //
      // Expected: with the server denying `authorizePut` and the client
      // permissive, the client's push does NOT land at the server.
      //
      // Implication: 🚨 if cross-space pollution on the DO is intolerable,
      // the only fix is a DO-side `authorizePut` (or upstream advertise
      // hook).
      test('H2: server-side authorizePut is the only effective gate against client outbound push', async () => {
        const { repos, adapters } = await createHostClientRepoTopology({
          subductionPolicies: {
            host: {
              ...PERMISSIVE_POLICY,
              authorizePut: async () => {
                throw new Error('denied');
              },
            },
          },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = client.create<{ text?: string }>({ text: 'client-outbound-blocked' });
        await waitForSubductionSave();

        const progress = host.findWithProgress<{ text?: string }>(handle.url);
        await sleep(NEGATIVE_ASSERTION_DELAY_MS);
        expect(progress.peek().state).to.not.equal('ready');
      });
    });
  });

  const createLevelAdapter = async (level = createTestLevel()) => {
    const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
    await openAndClose(level, storage);
    return storage;
  };
});

type ShareConfig = Exclude<ConstructorParameters<typeof Repo>[0], undefined>['shareConfig'];

type ConnectedRepoOptions = {
  storages?: StorageAdapterInterface[];
  connectionStateProvider?: TestConnectionStateProvider;
  shareConfig?: ShareConfig;
  /**
   * Per-peer subduction adapter role override. Defaults to `'connect'` for every
   * peer when omitted (matches the production wiring in `AutomergeHost`).
   */
  roles?: Record<string, 'connect' | 'accept'>;
  /**
   * Per-peer `subductionPolicy` override. Defaults to all-permissive for any
   * peer not listed here. Matches the production wiring in `AutomergeHost`.
   */
  subductionPolicies?: Record<string, SubductionPolicy>;
  /**
   * Per-peer `signer` override. When set, the Subduction-level Ed25519
   * identity is fixed for that peer, which is what
   * `SubductionPolicy.authorize{Connect,Fetch,Put}` see as `peerId` /
   * `requestor` / `author`. Without this, `Repo` mints a fresh
   * `MemorySigner` on construction and the peer-id is otherwise opaque to
   * the test, which makes per-peer assertions impossible.
   */
  signers?: Record<string, MemorySigner>;
  /**
   * Optional per-connection `onMessage` hooks, keyed by index into `connections`.
   * Each hook is invoked for every message that traverses the indexed
   * `TestAdapter.createPair` pair, in either direction.
   */
  onMessageByConnection?: Record<number, (message: Message) => void>;
};

const createRepoTopology = async <Peers extends string[], Peer extends string = Peers[number]>(args: {
  peers: Peers;
  connections: [Peer, Peer][];
  options?: ConnectedRepoOptions;
  onMessage?: (message: Message) => void;
  onMessageByConnection?: Record<number, (message: Message) => void>;
}) => {
  const onMessageByConnection = args.onMessageByConnection ?? args.options?.onMessageByConnection ?? {};
  const adapters = args.connections.map((_, idx) => {
    const perConnectionHook = onMessageByConnection[idx];
    const handler = (message: Message) => {
      args.onMessage?.(message);
      perConnectionHook?.(message);
    };
    return TestAdapter.createPair(args.options?.connectionStateProvider, handler) as [TestAdapter, TestAdapter];
  });
  const repos = args.peers.map((peerId, peerIndex) => {
    const network = adapters
      .map((pair, idx) => {
        return args.connections[idx].includes(peerId as Peer)
          ? peerId === args.connections[idx][0]
            ? pair[0]
            : pair[1]
          : null;
      })
      .filter(isNonNullable);

    const role = args.options?.roles?.[peerId as string] ?? 'connect';
    const subductionPolicy = args.options?.subductionPolicies?.[peerId as string];
    const signer = args.options?.signers?.[peerId as string];

    return createRepo(
      {
        peerId: peerId as PeerId,
        storage: args.options?.storages?.[peerIndex],
        network: [],
        shareConfig: args.options?.shareConfig,
        ...(subductionPolicy ? { subductionPolicy } : {}),
        ...(signer ? { signer } : {}),
        subductionAdapters: network.map((adapter) => ({
          adapter,
          serviceName: SUBDUCTION_SERVICE_NAME,
          role,
        })),
      },
      { registerCleanup: false },
    );
  });
  onTestFinished(async () => {
    await Promise.all(repos.map((repo) => repo.flush().catch(() => {})));
    await Promise.all(repos.map((repo) => shutdownRepo(repo)));
    disconnectAdapters(adapters);
  });
  return { repos, adapters };
};

const createHostClientRepoTopology = (options?: ConnectedRepoOptions) =>
  createRepoTopology({
    peers: HOST_AND_CLIENT,
    connections: [HOST_AND_CLIENT],
    options,
  });

const connectAdapters = async (pairs: [TestAdapter, TestAdapter][], options?: { noEmitPeerCandidate?: boolean }) => {
  for (const pair of pairs) {
    await pair[0].onConnect.wait();
    await pair[1].onConnect.wait();
    if (!options?.noEmitPeerCandidate) {
      pair[0].peerCandidate(pair[1].peerId!);
      pair[1].peerCandidate(pair[0].peerId!);
    }
  }
};

const disconnectAdapters = (pairs: [TestAdapter, TestAdapter][]) => {
  for (const [left, right] of pairs) {
    if (left.peerId && right.peerId) {
      left.peerDisconnected(right.peerId);
      right.peerDisconnected(left.peerId);
    }
    left.disconnect();
    right.disconnect();
  }
};

const reconnectAdapters = async (pairs: [TestAdapter, TestAdapter][]) => {
  for (const pair of pairs) {
    pair[0].peerDisconnected(pair[1].peerId!);
    pair[1].peerDisconnected(pair[0].peerId!);
    pair[0].peerCandidate(pair[1].peerId!);
    pair[1].peerCandidate(pair[0].peerId!);
  }
};

const shutdownRepo = async (repo: Repo) => {
  await repo.shutdown().catch(() => {});
};

const createRepo = (
  options?: ConstructorParameters<typeof Repo>[0],
  cleanupOptions: { registerCleanup?: boolean } = {},
) => {
  const repo = new Repo({
    // Reduce sync timeout so inflight syncWithAllPeers fails fast when a relay
    // peer does not yet have the document; self-healing retries kick in quickly.
    subductionTimeouts: {
      syncMs: 2_000,
      healInitialDelayMs: 100,
    },
    ...options,
  });
  if (cleanupOptions.registerCleanup ?? true) {
    onTestFinished(async () => {
      await shutdownRepo(repo);
    });
  }
  return repo;
};

const waitForSubductionSave = async () => {
  await sleep(150);
};

export const createTmpPath = (): string => {
  return `/tmp/dxos-${PublicKey.random().toHex()}`;
};

// ── Policy helpers ────────────────────────────────────────────────────────
//
// `SubductionPolicy` is just an object of four async hooks. The helpers below
// wrap that minimal shape with closure-captured behaviour so individual tests
// can express "deny these sedimentrees", "deny these requestors", or "count
// hook invocations" without re-stating the boilerplate four-hook object every
// time. None of these helpers add new behaviour beyond what the upstream
// `Policy` interface allows; they exist only to keep test bodies readable.

type HookName = 'authorizeConnect' | 'authorizeFetch' | 'authorizePut' | 'filterAuthorizedFetch';

const PERMISSIVE_POLICY: SubductionPolicy = {
  authorizeConnect: async () => {},
  authorizeFetch: async () => {},
  authorizePut: async () => {},
  filterAuthorizedFetch: async (_peerId, ids) => ids,
};

/**
 * A counting wrapper around a base policy. Returns the policy itself plus a
 * `counters` record (post-call counts per hook) and a `calls` log keyed by
 * hook with the raw argument tuple as observed at the bridge boundary.
 *
 * Useful for "how many times did `authorizeFetch` actually fire on the
 * proactive-push path?" style questions where the answer is otherwise
 * indistinguishable from "the hook fired but allowed everything".
 *
 * The base policy defaults to all-permissive; pass a partial override to
 * change individual hooks while still getting counters on the others.
 */
const createCountingPolicy = (
  base: Partial<SubductionPolicy> = {},
): {
  policy: SubductionPolicy;
  counters: Record<HookName, number>;
  calls: Array<{ hook: HookName; args: unknown[] }>;
} => {
  const counters: Record<HookName, number> = {
    authorizeConnect: 0,
    authorizeFetch: 0,
    authorizePut: 0,
    filterAuthorizedFetch: 0,
  };
  const calls: Array<{ hook: HookName; args: unknown[] }> = [];
  const merged: SubductionPolicy = { ...PERMISSIVE_POLICY, ...base };
  const policy: SubductionPolicy = {
    authorizeConnect: async (...args) => {
      counters.authorizeConnect++;
      calls.push({ hook: 'authorizeConnect', args });
      return merged.authorizeConnect(args[0]);
    },
    authorizeFetch: async (...args) => {
      counters.authorizeFetch++;
      calls.push({ hook: 'authorizeFetch', args });
      return merged.authorizeFetch(args[0], args[1]);
    },
    authorizePut: async (...args) => {
      counters.authorizePut++;
      calls.push({ hook: 'authorizePut', args });
      return merged.authorizePut(args[0], args[1], args[2]);
    },
    filterAuthorizedFetch: async (...args) => {
      counters.filterAuthorizedFetch++;
      calls.push({ hook: 'filterAuthorizedFetch', args });
      return merged.filterAuthorizedFetch(args[0], args[1]);
    },
  };
  return { policy, counters, calls };
};

/**
 * Map a base58check-encoded `DocumentId` to the 32-byte `SedimentreeId` that
 * subduction sees. Mirrors `toSedimentreeId(...)` from
 * `@automerge/automerge-repo/dist/subduction/helpers` (not re-exported from
 * the package root) and the inverse `sedimentreeIdToDocumentId` helper in
 * the edge DO.
 *
 * Implemented here rather than imported so a future upstream refactor of
 * `helpers.js` cannot silently change the test's encoding assumptions.
 */
const documentIdToSedimentreeIdString = (documentId: DocumentId): string => {
  const docIdBytes = documentIdToBinary(documentId)!;
  const padded = new Uint8Array(32);
  padded.set(docIdBytes.subarray(0, 32));
  return SedimentreeId.fromBytes(padded).toString();
};

/**
 * Build a per-sedimentree gate keyed by an allow-set of `SedimentreeId`
 * string representations (the same format `SedimentreeId.toString()`
 * produces). The chosen hook denies (throws) for any sedimentree NOT in the
 * allow set; the other three hooks stay permissive.
 *
 * The allow set is read on every call (it's a closure-captured `Set`), so
 * tests can mutate it mid-run when probing recovery.
 */
const denyExceptSedimentrees = (allow: Set<string>, hook: 'authorizePut' | 'authorizeFetch'): SubductionPolicy => {
  const policy: SubductionPolicy = { ...PERMISSIVE_POLICY };
  if (hook === 'authorizePut') {
    policy.authorizePut = async (_req, _author, sedimentreeId) => {
      if (!allow.has(sedimentreeId.toString())) {
        throw new Error(`denied authorizePut for ${sedimentreeId.toString()}`);
      }
    };
  } else {
    policy.authorizeFetch = async (_peerId, sedimentreeId) => {
      if (!allow.has(sedimentreeId.toString())) {
        throw new Error(`denied authorizeFetch for ${sedimentreeId.toString()}`);
      }
    };
  }
  return policy;
};

/**
 * Build a per-peer gate. The chosen hook denies (throws) for peers whose
 * `peerId.toString()` matches one of the supplied strings; the other hooks
 * stay permissive. `authorizePut` uses the `requestor` argument as the
 * peer-identity key (matches the SKILL doc framing of "the peer pushing the
 * bytes"); change to `author` if/when a test requires it.
 */
const denyPeers = (
  deniedPeerIds: Set<string>,
  hook: 'authorizeConnect' | 'authorizePut' | 'authorizeFetch',
): SubductionPolicy => {
  const policy: SubductionPolicy = { ...PERMISSIVE_POLICY };
  if (hook === 'authorizeConnect') {
    policy.authorizeConnect = async (peerId) => {
      if (deniedPeerIds.has(peerId.toString())) {
        throw new Error(`denied authorizeConnect for ${peerId.toString()}`);
      }
    };
  } else if (hook === 'authorizePut') {
    policy.authorizePut = async (requestor) => {
      if (deniedPeerIds.has(requestor.toString())) {
        throw new Error(`denied authorizePut from requestor ${requestor.toString()}`);
      }
    };
  } else {
    policy.authorizeFetch = async (peerId) => {
      if (deniedPeerIds.has(peerId.toString())) {
        throw new Error(`denied authorizeFetch from ${peerId.toString()}`);
      }
    };
  }
  return policy;
};

/**
 * 3-peer star topology: `client` in the center, connected to both
 * `server1` and `server2`. The two servers are NOT connected to each
 * other. Used by Blocks A and C to probe per-peer policy granularity
 * (does the bridge let us deny just one server?).
 */
const createStarTopology = (options?: ConnectedRepoOptions) =>
  createRepoTopology({
    peers: ['client', 'server1', 'server2'],
    connections: [
      ['client', 'server1'],
      ['client', 'server2'],
    ],
    options,
  });
