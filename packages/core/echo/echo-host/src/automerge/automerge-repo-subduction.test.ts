//
// Copyright 2026 DXOS.org
//

import { next as A, type Heads, getHeads, saveSince } from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocHandle,
  type DocumentId,
  type Message,
  type PeerId,
  type SubductionPeerBindFailure,
  type SubductionPolicy,
  generateAutomergeUrl,
  initSubduction,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger, asyncTimeout, sleep } from '@dxos/async';

import { TestAdapter } from '../testing/index.ts';
import {
  FIND_STATES,
  NO_TRAFFIC_WINDOW_MS,
  SUBDUCTION_MESSAGE_TYPE,
  SUBDUCTION_SERVICE_NAME,
  SYNC_WINDOW_MS,
  connectAdapters,
  createDenyGate,
  createHostClientRepoTopology,
  createRepo,
  createRepoTopology,
  createSqliteAdapter,
  createStarTopology,
  disconnectAdapters,
  findInStates,
  reconnectAdapters,
  shutdownRepo,
  waitForQueryState,
  waitForSubductionSave,
} from './subduction-test-utils.ts';

describe('AutomergeRepo with Subduction', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('documents missing from local storage go to loading state', async () => {
    const { repos, adapters, repoPairs } = await createHostClientRepoTopology();
    const [host] = repos;
    await connectAdapters(adapters, { repoPairs });
    const url = 'automerge:3JN8F3Z4dUWEEKKFN7WE9gEGvVUT' as AutomergeUrl;

    const progress = host.findWithProgress(url);
    expect(progress.peek().state).to.equal('loading');
  });

  test('documents on disk go to ready state', async () => {
    const storage = await createSqliteAdapter();
    let url: AutomergeUrl | undefined;

    {
      const repo = createRepo({ network: [], storage });
      const handle = repo.create<{ field?: string }>({ field: 'value' });
      url = handle.url;
      await repo.flush();
      await repo.shutdown();
    }

    // `Repo.shutdown()` closes its storage adapter; reopen before reusing it for
    // the second `Repo` that simulates a reload from disk.
    await storage.open();

    {
      const repo = createRepo({ network: [], storage });
      const handle = await repo.find<{ field?: string }>(url as AutomergeUrl);
      await handle.whenReady(['ready']);
      expect(handle.doc()?.field).to.equal('value');
    }
  });

  describe('network', () => {
    test('basic networking', async () => {
      const { repos, adapters, repoPairs } = await createHostClientRepoTopology();
      const [host, client] = repos;
      await connectAdapters(adapters, { repoPairs });

      const handle = host.create<{ text?: string }>();
      const text = 'Hello world';
      handle.change((doc: any) => {
        doc.text = text;
      });
      await waitForSubductionSave(repos);

      await expect
        .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: SYNC_WINDOW_MS })
        .toEqual(text);
    });

    test('share config does not gate subduction replication', async () => {
      const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
        shareConfig: {
          access: async () => false,
          announce: async () => false,
        },
      });
      const [host, client] = repos;
      await connectAdapters(adapters, { repoPairs });

      const handle = host.create<{ text?: string }>();
      handle.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave(repos);

      await expect
        .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: SYNC_WINDOW_MS })
        .toEqual('Hello world');
    });

    // 4-peer chain (A→B→C→D) waits sequentially on each hop instead of opening all
    // three downstream queries at once. Calling `findInStates` opens a
    // `SubductionSource` that proactively does `syncWithAllPeers`, and a `find`
    // issued on C or D before B has the doc causes the fetch to fail-fast at the
    // configured `syncMs` (2 s). Recovery then waits for the heal scheduler's
    // exponential backoff (100 → 200 → 400 → 800 → 1600 → 3200 ms ...), which
    // can stack across hops and consume the test's wall-clock budget — that is
    // exactly the failure mode observed in CI: 5002 ms timeout with multiple
    // `connection/managed.rs:278 request RequestId { ... } timed out` errors.
    //
    // Sequencing the waits keeps each hop on the happy path (upstream peer has
    // the doc by the time the next downstream peer opens its source), avoiding
    // the cascading heal backoffs while still exercising the full chain.
    test('replication through a 4 peer chain', async () => {
      const { repos, adapters, repoPairs } = await createRepoTopology({
        peers: ['A', 'B', 'C', 'D'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
          ['C', 'D'],
        ],
      });
      const [repoA, repoB, repoC, repoD] = repos;
      await connectAdapters(adapters, { repoPairs });

      const docA = repoA.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave(repos);

      const docB = await findInStates<{ text?: string }>(repoB, docA.url, FIND_STATES);
      await expect.poll(() => docB.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('Hello world');

      const docC = await findInStates<{ text?: string }>(repoC, docA.url, FIND_STATES);
      await expect.poll(() => docC.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('Hello world');

      const docD = await findInStates<{ text?: string }>(repoD, docA.url, FIND_STATES);
      await expect.poll(() => docD.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('Hello world');
    });

    test('documents loaded from disk get replicated', async () => {
      const storage = await createSqliteAdapter();
      let url: AutomergeUrl | undefined;

      {
        const peer1 = createRepo({ network: [], storage }, { registerCleanup: false });
        const handle = peer1.create({ text: 'foo' });
        await peer1.flush();
        await waitForSubductionSave([peer1]);
        url = handle.url;
        await shutdownRepo(peer1);
      }

      // `Repo.shutdown()` closes its storage adapter; reopen before reusing it in the topology.
      await storage.open();

      const { repos, adapters, repoPairs } = await createHostClientRepoTopology({ storages: [storage] });
      const [peer1, peer2] = repos;
      await connectAdapters(adapters, { repoPairs });

      const hostHandle = await peer1.find<any>(url as AutomergeUrl);
      await hostHandle.whenReady();
      await expect.poll(() => hostHandle.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('foo');
      const peer2Handle = await findInStates<any>(peer2, hostHandle.url, FIND_STATES);
      // Bumped from 5_000 to 10_000: on a loaded CI box, the subduction RequestId
      // round-trip can hit its internal timeout (~5 s) and only the heal retry succeeds,
      // pushing past the original 5 s window. See the same fix on `accept/connect syncs`.
      await expect.poll(() => peer2Handle.doc(), { timeout: SYNC_WINDOW_MS }).toEqual(hostHandle.doc());
    });

    test('client creates doc and Repo persists it to disk', async () => {
      const storage = await createSqliteAdapter();
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
      await waitForSubductionSave([repo]);
      await repo.shutdown();

      // `Repo.shutdown()` closes its storage adapter; reopen before reusing it for `repo2`.
      await storage.open();

      const repo2 = createRepo({ network: [], storage });
      const reloaded = await repo2.find<any>(documentId);
      expect(reloaded.doc()!.field).to.deep.equal(value);
    });

    test('two repo sync docs on `update` call', async () => {
      const { repos, adapters, repoPairs } = await createHostClientRepoTopology();
      const [repoA, repoB] = repos;
      await connectAdapters(adapters, { repoPairs });

      const handleA = repoA.create<any>();
      // Barrier before B looks: a fetch that races A's unflushed save settles success-empty and
      // subduction never re-asks, so B's handle would stay empty for the whole poll window.
      await waitForSubductionSave(repos);
      const handleB = await findInStates<any>(repoB, handleA.url, FIND_STATES);

      const text = 'Hello world';
      handleA.update((doc: any) => {
        return A.change(doc, (doc: any) => {
          doc.text = text;
        });
      });
      await waitForSubductionSave(repos);

      expect(handleA.doc()!.text).to.equal(text);
      await expect.poll(() => handleB.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual(text);
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

    // Isolates a field report of a permanently diverged document (local and edge heads sharing
    // nothing for days) away from peer-to-peer subduction: two JS peers recover from exactly that
    // state here, including when the doc is denied on a second connection, so the reported failure
    // is not in this path.
    test('partitioned concurrent edits converge on reconnect', async () => {
      let connectionState: 'on' | 'off' = 'on';
      const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
        connectionStateProvider: () => connectionState,
      });
      const [host, client] = repos;
      await connectAdapters(adapters, { repoPairs });

      const handleA = host.create<{ fromHost?: string; fromClient?: string }>();
      handleA.change((doc: any) => {
        doc.fromHost = 'initial';
      });
      await waitForSubductionSave(repos);
      const handleB = await findInStates<{ fromHost?: string; fromClient?: string }>(client, handleA.url, FIND_STATES);
      await expect.poll(() => handleB.doc()?.fromHost, { timeout: SYNC_WINDOW_MS }).toEqual('initial');

      // Gate the transport rather than `disconnectAdapters`, which clears the peer ids
      // `reconnectAdapters` needs, then edit both sides so neither head descends from the other.
      connectionState = 'off';
      handleA.change((doc: any) => {
        doc.fromHost = 'host-offline';
      });
      handleB.change((doc: any) => {
        doc.fromClient = 'client-offline';
      });
      await waitForSubductionSave(repos);
      expect(getHeads(handleA.doc()!).some((head) => getHeads(handleB.doc()!).includes(head))).toBe(false);

      connectionState = 'on';
      await reconnectAdapters(adapters, { repoPairs });

      await expect.poll(() => handleB.doc()?.fromHost, { timeout: SYNC_WINDOW_MS }).toEqual('host-offline');
      await expect.poll(() => handleA.doc()?.fromClient, { timeout: SYNC_WINDOW_MS }).toEqual('client-offline');
    });

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
    test('replicate document after request', async () => {
      const { repos, adapters, repoPairs } = await createHostClientRepoTopology();
      const [host, client] = repos;
      await connectAdapters(adapters, { noEmitPeerCandidate: true });

      const docA = host.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'Hello world';
      });
      await waitForSubductionSave(repos);

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
      await reconnectAdapters(adapters, { repoPairs });
      await waitForQueryState(progress, ['ready'], { timeout: SYNC_WINDOW_MS });
    });

    // Regression test for the concurrent-shutdown stall in
    // `@automerge/automerge-repo@2.6.0-subduction.17` fixed by
    // `patches/@automerge__automerge-repo@2.6.0-subduction.17.patch`.
    // Without the patch, `Promise.all([repoA.shutdown(), repoB.shutdown()])`
    // takes ~30s (the Rust-side per-request timeout); with it, single-digit ms.
    test('concurrent shutdown completes quickly when both peers have in-flight pushes', async () => {
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

      await connectAdapters([adapters], { repoPairs: [[repoA, repoB]] });

      // Get a doc onto both sides so each peer has a running entry.
      // Wait for `'ready'` (NOT `FIND_STATES` which permits `'loading'`)
      // so repoB has actually replicated the doc before the next mutation
      // — otherwise the symmetric in-flight push state this test relies on
      // is not reliably set up.
      const handle = repoA.create<{ text?: string }>();
      handle.change((doc: any) => {
        doc.text = 'initial';
      });
      await waitForSubductionSave([repoA, repoB]);
      await findInStates(repoB, handle.url, ['ready']);

      // Pending throttled save at the moment of shutdown — required
      // to put an `addBatch` in flight when both sides hit step 4.
      handle.change((doc: any) => {
        doc.text = 'pre-close write';
      });

      await asyncTimeout(Promise.all([repoA.shutdown(), repoB.shutdown()]), 1_500);
    });
  });

  // The contract block below tests subduction-specific behavior described in
  // `.agents/skills/effect/subduction/SKILL.md`. None of these can be expressed
  // against the classical-network transport, which is why they live here and
  // not in `automerge-repo.test.ts`.
  //
  // Client-only-policy characterization tests live in
  // `automerge-repo-subduction-policy.test.ts`.
  describe('subduction contract', () => {
    describe('role matrix', () => {
      test('connect/accept syncs', async () => {
        const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
          roles: { host: 'connect', client: 'accept' },
        });
        const [host, client] = repos;
        await connectAdapters(adapters, { repoPairs });

        const handle = host.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'connect/accept';
        });
        await waitForSubductionSave(repos);

        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: SYNC_WINDOW_MS })
          .toEqual('connect/accept');
      });

      test('accept/connect syncs', async () => {
        const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
          roles: { host: 'accept', client: 'connect' },
        });
        const [host, client] = repos;
        await connectAdapters(adapters, { repoPairs });

        const handle = host.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'accept/connect';
        });
        await waitForSubductionSave(repos);

        // Bumped from 5_000 to 10_000: on a loaded CI box, the underlying
        // subduction `RequestId` round-trip can hit its own internal timeout
        // (~5s) and only the retry succeeds, which pushes us past the poll
        // window. Local runs land in ~200-300 ms; CI was occasionally flaking
        // at exactly 5005 ms.
        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: SYNC_WINDOW_MS })
          .toEqual('accept/connect');
      });

      // SKILL doc: two `accept` peers are both responders, neither initiates the
      // handshake, so the query never reaches `'ready'`. We bound the negative
      // assertion at 1.5 s; if the fork ever heals via retry this test will catch
      // the change.
      test('accept/accept does not sync', async () => {
        const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
          roles: { host: 'accept', client: 'accept' },
        });
        const [host, client] = repos;
        await connectAdapters(adapters);

        const handle = host.create<{ text?: string }>();
        handle.change((doc: any) => {
          doc.text = 'accept/accept';
        });
        await waitForSubductionSave(repos);

        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        // Two `accept` peers never handshake, so there is no refusal to observe and no traffic to
        // drain — the bounded window is the assertion. We can't assert `'loading'` strictly either,
        // because the dormant source may go `'unavailable'`; what we CAN assert is never `'ready'`.
        await sleep(NO_TRAFFIC_WINDOW_MS);
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
        const gate = createDenyGate();
        const denyingPolicy: SubductionPolicy = {
          authorizeConnect: async () => {},
          authorizeFetch: async () => gate.deny(),
          authorizePut: async () => {},
          filterAuthorizedFetch: async (_peerId, ids) => ids,
        };

        const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
          subductionPolicies: { host: denyingPolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters, { repoPairs });

        const handle = host.create<{ text?: string }>({ text: 'should-not-fetch' });
        await waitForSubductionSave(repos);

        // Client explicitly requests the doc by URL. Host's `authorizeFetch`
        // denial should prevent the response. We rely on `findWithProgress`
        // staying out of `'ready'` and the doc body remaining empty.
        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        // Wait for the host to actually refuse, rather than for a duration in which it might have.
        await gate.waitForDenial();
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
        const { repos, adapters, repoPairs } = await createHostClientRepoTopology();
        const [host, client] = repos;
        await connectAdapters(adapters, { repoPairs });

        const handle = host.create<{ text?: string }>({ text: 'should-fetch' });
        await waitForSubductionSave(repos);

        await expect
          .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, {
            timeout: SYNC_WINDOW_MS,
          })
          .toEqual('should-fetch');
      });

      test('authorizePut denial blocks writes from peer', async () => {
        const gate = createDenyGate();
        const denyingPolicy: SubductionPolicy = {
          authorizeConnect: async () => {},
          authorizeFetch: async () => {},
          authorizePut: async () => gate.deny(),
          filterAuthorizedFetch: async (_peerId, ids) => ids,
        };

        // Receiver creates the doc and seeds initial content; sender then attempts
        // to push a change. Receiver's policy denies puts → receiver doc must
        // remain at the original heads.
        const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
          subductionPolicies: { host: denyingPolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters, { repoPairs });

        const hostHandle = host.create<{ text?: string }>({ text: 'initial' });
        await waitForSubductionSave(repos);

        const clientHandle = await findInStates<{ text?: string }>(client, hostHandle.url, FIND_STATES);
        const initialHostHeads = getHeads(hostHandle.doc()!);

        clientHandle.change((doc: any) => {
          doc.text = 'should-be-rejected';
        });
        // The push reached the host and was refused; no need to guess how long that takes.
        await gate.waitForDenial();

        // Host should not have accepted client's change.
        expect(getHeads(hostHandle.doc()!)).to.deep.equal(initialHostHeads);
        expect(hostHandle.doc()?.text).to.equal('initial');
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
        const gate = createDenyGate();
        const mutablePolicy: SubductionPolicy = {
          authorizeConnect: async () => {},
          authorizeFetch: async () => {
            if (!allowFetch) {
              gate.deny();
            }
          },
          authorizePut: async () => {},
          filterAuthorizedFetch: async (_peerId, ids) => ids,
        };

        const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
          subductionPolicies: { host: mutablePolicy },
        });
        const [host, client] = repos;
        await connectAdapters(adapters, { repoPairs });

        const handle = host.create<{ text?: string }>({ text: 'gated' });
        await waitForSubductionSave(repos);

        // (1) Initial denial: query does not reach `'ready'`, doc stays empty.
        const progress = client.findWithProgress<{ text?: string }>(handle.url);
        await gate.waitForDenial();
        expect(progress.peek().state).to.not.equal('ready');
        const docHandle = client.handles[parseAutomergeUrl(handle.url).documentId] as
          | DocHandle<{ text?: string }>
          | undefined;
        expect(docHandle?.doc()?.text).to.be.undefined;

        // (2) Flip the policy and (3) kick the source. Without the kick,
        // recovery is left to heal-retry exponential backoff (slow + flaky).
        // The refusal is observed the instant it fires, but the entry settles `all-failed` a moment
        // later and the flip below only helps once it has. Nothing reports that transition.
        await sleep(NO_TRAFFIC_WINDOW_MS);
        allowFetch = true;
        client.shareConfigChanged();

        // Sync now succeeds: doc reaches the client.
        await expect.poll(() => docHandle?.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('gated');
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
      // No transport of any kind between these peers, so there is nothing to observe or drain.
      await sleep(NO_TRAFFIC_WINDOW_MS);
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

      const { repos, adapters, repoPairs } = await createRepoTopology({
        peers: ['A', 'B', 'C'],
        connections: [
          ['A', 'B'],
          ['B', 'C'],
        ],
        // Hook installed only on the B↔C pair (second connection).
        onMessageByConnection: { 1: onMessage },
      });
      const [repoA, repoB, repoC] = repos;
      await connectAdapters(adapters, { repoPairs });

      const docA = repoA.create<{ text?: string }>();
      docA.change((doc: any) => {
        doc.text = 'relayed';
      });
      await waitForSubductionSave(repos);

      // Wait for the doc to reach B before C asks for it. A fetch C issues while B is still empty
      // settles success-empty and is never re-asked, so the hop has to be observed, not assumed.
      const docB = await findInStates<{ text?: string }>(repoB, docA.url, FIND_STATES);
      await expect.poll(() => docB.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('relayed');

      const docC = await findInStates<{ text?: string }>(repoC, docA.url, FIND_STATES);
      await expect.poll(() => docC.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('relayed');

      // If C reached `'ready'` AND we observed subduction-typed messages on the
      // B↔C pair, B is relaying via subduction (not via some classical bypass).
      expect(bcSubductionMessages).to.be.greaterThan(0);
    });
  });
});

// In-memory adapters only, so unlike the suite above these run in CI.
describe('AutomergeRepo with Subduction: connection loss', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test('a peer offered again mid-round does not hold back later edits', async () => {
    let framesDelivered: 'on' | 'off' = 'on';
    const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
      connectionStateProvider: () => framesDelivered,
      subductionTimeouts: { syncMs: 6_000, healInitialDelayMs: 100 },
    });
    const [host, client] = repos;
    await connectAdapters(adapters, { repoPairs });

    const handle = host.create<{ text?: string }>();
    handle.change((doc: any) => {
      doc.text = 'first';
    });
    await waitForSubductionSave(repos);
    const observed = await findInStates<{ text?: string }>(client, handle.url, FIND_STATES);
    await expect.poll(() => observed.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('first');

    framesDelivered = 'off';
    handle.change((doc: any) => {
      doc.text = 'second';
    });
    await waitForSubductionSave(repos);
    handle.change((doc: any) => {
      doc.text = 'third';
    });
    await waitForSubductionSave(repos);

    framesDelivered = 'on';
    await reconnectAdapters(adapters);
    await expect.poll(() => observed.doc()?.text, { timeout: 3_000 }).toEqual('third');
  });

  test('losing one peer mid-round does not hold back edits for the others', async () => {
    let server1Reachable: 'on' | 'off' = 'on';
    const { repos, adapters, repoPairs } = await createStarTopology({
      connectionStateProviderByConnection: { 0: () => server1Reachable },
      subductionTimeouts: { syncMs: 6_000, healInitialDelayMs: 100 },
    });
    const [client, , server2] = repos;
    await connectAdapters(adapters, { repoPairs });

    const handle = client.create<{ text?: string }>();
    handle.change((doc: any) => {
      doc.text = 'first';
    });
    await waitForSubductionSave(repos);
    const observed = await findInStates<{ text?: string }>(server2, handle.url, FIND_STATES);
    await expect.poll(() => observed.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('first');

    server1Reachable = 'off';
    handle.change((doc: any) => {
      doc.text = 'second';
    });
    await waitForSubductionSave(repos);
    handle.change((doc: any) => {
      doc.text = 'third';
    });
    await waitForSubductionSave(repos);

    const [clientSide, server1Side] = adapters[0];
    clientSide.peerDisconnected(server1Side.peerId!);
    server1Side.peerDisconnected(clientSide.peerId!);
    await expect.poll(() => observed.doc()?.text, { timeout: 3_000 }).toEqual('third');
  });

  test('a handshake whose reply never arrives fails once the handshake timeout elapses', async () => {
    const { repos, adapters } = await createHostClientRepoTopology({
      connectionStateProvider: () => 'off',
      subductionTimeouts: { handshakeMs: 200 },
    });
    const [host, client] = repos;
    const failed = new Trigger<SubductionPeerBindFailure>();
    client.once('subduction-peer-bind-failed', (failure) => failed.wake(failure));
    await connectAdapters(adapters);

    const failure = await failed.wait({ timeout: 2_000 });
    expect(failure.repoPeerId).toEqual(host.peerId);
    expect(String(failure.error)).toMatch(/handshake timed out/);
  });

  test('a peer whose handshake timed out binds and syncs on the next attempt', async () => {
    let framesDelivered: 'on' | 'off' = 'off';
    const { repos, adapters, repoPairs } = await createHostClientRepoTopology({
      connectionStateProvider: () => framesDelivered,
      subductionTimeouts: { handshakeMs: 200, syncMs: 2_000, healInitialDelayMs: 100 },
    });
    const [host, client] = repos;
    const failed = new Trigger();
    client.once('subduction-peer-bind-failed', () => failed.wake());
    await connectAdapters(adapters);
    await failed.wait({ timeout: 2_000 });

    framesDelivered = 'on';
    await reconnectAdapters(adapters, { repoPairs });
    const handle = host.create<{ text?: string }>({ text: 'after-timeout' });
    await waitForSubductionSave(repos);
    const observed = await findInStates<{ text?: string }>(client, handle.url, FIND_STATES);
    await expect.poll(() => observed.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('after-timeout');
  });

  test('a peer lost before its handshake completes does not hold back edits', async () => {
    let server1Reachable: 'on' | 'off' = 'on';
    const { repos, adapters, repoPairs } = await createStarTopology({
      connectionStateProviderByConnection: { 0: () => server1Reachable },
      subductionTimeouts: { syncMs: 6_000, healInitialDelayMs: 100 },
    });
    const [client, server1, server2] = repos;
    const [clientSide, server1Side] = adapters[0];
    await connectAdapters([adapters[1]], { repoPairs: [repoPairs[1]] });
    await clientSide.onConnect.wait();
    await server1Side.onConnect.wait();

    const server1Bound = new Promise<void>((resolve) => server1.once('subduction-peer-bound', () => resolve()));
    server1Side.peerCandidate(clientSide.peerId!);
    clientSide.peerCandidate(server1Side.peerId!);
    clientSide.peerDisconnected(server1Side.peerId!);
    await server1Bound;

    const handle = client.create<{ text?: string }>();
    handle.change((doc: any) => {
      doc.text = 'first';
    });
    await waitForSubductionSave(repos);
    const observed = await findInStates<{ text?: string }>(server2, handle.url, FIND_STATES);
    await expect.poll(() => observed.doc()?.text, { timeout: SYNC_WINDOW_MS }).toEqual('first');

    server1Reachable = 'off';
    handle.change((doc: any) => {
      doc.text = 'second';
    });
    await waitForSubductionSave(repos);
    handle.change((doc: any) => {
      doc.text = 'third';
    });
    await waitForSubductionSave(repos);
    await expect.poll(() => observed.doc()?.text, { timeout: 3_000 }).toEqual('third');
  });
});
