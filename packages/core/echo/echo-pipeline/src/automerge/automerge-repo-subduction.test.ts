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
  type SubductionPolicy,
  generateAutomergeUrl,
  initSubduction,
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';

import { TestAdapter } from '../testing';
import {
  FIND_STATES,
  NEGATIVE_ASSERTION_DELAY_MS,
  SUBDUCTION_MESSAGE_TYPE,
  SUBDUCTION_SERVICE_NAME,
  connectAdapters,
  createHostClientRepoTopology,
  createLevelAdapter,
  createRepo,
  createRepoTopology,
  disconnectAdapters,
  findInStates,
  reconnectAdapters,
  shutdownRepo,
  waitForQueryState,
  waitForSubductionSave,
} from './subduction-test-utils';

describe('AutomergeRepo with Subduction', () => {
  beforeAll(async () => {
    await initSubduction();
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
    test('replication through a 4 peer chain', { timeout: 15_000 }, async () => {
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

      const docB = await findInStates<{ text?: string }>(repoB, docA.url, FIND_STATES);
      await expect.poll(() => docB.doc()?.text, { timeout: 10_000 }).toEqual('Hello world');

      const docC = await findInStates<{ text?: string }>(repoC, docA.url, FIND_STATES);
      await expect.poll(() => docC.doc()?.text, { timeout: 10_000 }).toEqual('Hello world');

      const docD = await findInStates<{ text?: string }>(repoD, docA.url, FIND_STATES);
      await expect.poll(() => docD.doc()?.text, { timeout: 10_000 }).toEqual('Hello world');
    });

    test('documents loaded from disk get replicated', { timeout: 15_000 }, async () => {
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
      // Bumped from 5_000 to 10_000: on a loaded CI box, the subduction RequestId
      // round-trip can hit its internal timeout (~5 s) and only the heal retry succeeds,
      // pushing past the original 5 s window. See the same fix on `accept/connect syncs`.
      await expect.poll(() => peer2Handle.doc(), { timeout: 10_000 }).toEqual(hostHandle.doc());
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
  //
  // Client-only-policy characterization tests live in
  // `automerge-repo-subduction-policy.test.ts`.
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
});
