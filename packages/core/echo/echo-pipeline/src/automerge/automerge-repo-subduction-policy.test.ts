//
// Copyright 2026 DXOS.org
//

import { type DocHandle, type SubductionPolicy, initSubduction, parseAutomergeUrl } from '@automerge/automerge-repo';
import { MemorySigner } from '@automerge/automerge-subduction';
import { beforeAll, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';

import {
  FIND_STATES,
  NEGATIVE_ASSERTION_DELAY_MS,
  PERMISSIVE_POLICY,
  connectAdapters,
  createCountingPolicy,
  createHostClientRepoTopology,
  createRepoTopology,
  createStarTopology,
  denyExceptSedimentrees,
  denyPeers,
  documentIdToSedimentreeIdString,
  findInStates,
  reconnectAdapters,
  waitForQueryState,
  waitForSubductionSave,
} from './subduction-test-utils';

// SubductionPolicy: characterizing client-only gates.
//
// The blocks below answer the question "if the server is permissive (e.g.
// a passive edge DO that accepts everything from authenticated clients),
// what can the client gate via its OWN `subductionPolicy`?". Each block
// varies one dimension of the matrix (hook, side, data-flow direction,
// granularity, topology, state change). Tests are deliberately named with
// the empirical outcome up-front (e.g. `... does NOT gate ...`) so the
// shape of any future upstream fix is obvious.
describe('SubductionPolicy', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  // Client-as-receiver.
  //
  // Server creates the doc; we want to know what the client can refuse to
  // ingest using ONLY its own policy. The headline positive result is the
  // first test: the client can refuse inbound writes via `authorizePut`.
  // Everything else here probes granularity (per-sedimentree, per-requestor)
  // and failure isolation.
  describe('client-as-receiver', () => {
    // Hypothesis: a denying `authorizePut` on the receiver blocks ALL
    // inbound bytes from a permissive peer.
    //
    // Expected: the client's findWithProgress for the server's url stays
    // out of `'ready'` and the handle never gains a `doc()`.
    //
    // Implication for client-side gating: ✅ `authorizePut` is the
    // primary lever for refusing inbound replication.
    test('authorizePut on client denies inbound writes from permissive server', async () => {
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
    // `authorizePut` instead.
    test('authorizeFetch on client does NOT gate inbound proactive push', async () => {
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
    test('authorizePut: selective per-sedimentree denial', async () => {
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
    // Star-topology setup + two connection handshakes + initial doc replication
    // can run hot on slow CI runners; give the test budget that comfortably
    // exceeds the 5_000ms inner poll.
    test('authorizePut: selective per-requestor denial in star topology', async () => {
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
    }, 30_000);

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
    test('authorizePut denial does NOT poison subsequent allowed sedimentrees', async () => {
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

  // Client-as-source (negative-result block).
  //
  // Client owns the doc; we want to know whether ANY hook on the client
  // side can prevent its own Repo from pushing that doc to a connected
  // permissive server. Each test below is expected to FAIL to gate — the
  // assertions are written so an upstream fix that adds an outbound-push
  // hook will surface as a clean test failure.
  describe('client-as-source negative results', () => {
    // Hypothesis: `authorizePut` only gates inbound writes; it has no
    // effect on outbound bytes. The bridge does not consult any policy
    // hook before broadcasting `addBatch` to connected peers.
    //
    // Expected: server still receives the doc.
    //
    // Implication: ❌ Client-side `authorizePut` cannot prevent the
    // client from pushing its own data out. To stop outbound push, the
    // SERVER must deny via its own `authorizePut`, OR the channel must
    // not exist (see `authorizeConnect on client (initiator) nukes the
    // channel` below, or the granularity block).
    test('authorizePut on client does NOT gate outbound to a permissive server', async () => {
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
    test('authorizeFetch on client DOES gate outbound proactive push (empirical correction)', async () => {
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
    // on either side.
    //
    // Expected: server still receives. ❌ `filterAuthorizedFetch` is
    // bridge-dead under proactive push on either side.
    test('filterAuthorizedFetch on client does NOT gate outbound proactive push', async () => {
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
    test('authorizeConnect on client (initiator) nukes the channel (nuclear control)', async () => {
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

  // authorizeConnect granularity.
  //
  // Existing tests cover blanket "deny everything" on `authorizeConnect`.
  // This block probes per-peer denial, reconnect semantics, and counting.
  describe('authorizeConnect granularity', () => {
    // Hypothesis: in a star topology, denying `authorizeConnect` only for
    // `server1`'s peer-id refuses the handshake with server1 but not
    // with server2.
    //
    // Expected: client receives server2's doc, never server1's doc.
    // Connect counter shows two invocations (one allow, one deny).
    //
    // Implication: ✅ per-peer connect gating works. Effective on the
    // client side for refusing entire peers (as opposed to per-doc).
    test('authorizeConnect: per-peer denial in star topology', async () => {
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

    // Hypothesis: the role matrix requires at least one peer to be
    // `'connect'`, and either side denying `authorizeConnect` should
    // refuse the handshake — confirming `authorizeConnect` symmetry.
    //
    // Expected: with `host: 'accept'` / `client: 'connect'` and the
    // ACCEPTING side (host) denying connect, the handshake still fails;
    // the doc does not reach the client.
    //
    // Implication: ✅ either side denying `authorizeConnect` is
    // sufficient.
    test('authorizeConnect: denial on responder side also blocks handshake', async () => {
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
    test('authorizeConnect: fires once per handshake; reconnect re-invokes', async () => {
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

  // authorizeFetch / filterAuthorizedFetch invocation conditions.
  //
  // Pin DOWN when these hooks actually fire under the current bridge.
  describe('authorizeFetch + filterAuthorizedFetch invocation conditions', () => {
    // EMPIRICAL CORRECTION: the prior SKILL-doc-aligned hypothesis was
    // that `authorizeFetch` does NOT fire on proactive push. Observed
    // reality: it DOES fire (≥ 2 invocations in a 2-peer push setup).
    // The hook is consulted by the HOLDER for every peer it broadcasts
    // to.
    //
    // Expected: `authorizeFetch` counter > 0 in BOTH the proactive
    // push and the explicit fetch flows.
    //
    // Implication: ✅ `authorizeFetch` is the per-peer per-sedimentree
    // gate for OUTBOUND data flow on the holder. Combined with
    // `authorizePut` on the receiver, this gives a fully client-side
    // gate for both directions.
    test('authorizeFetch fires on BOTH proactive push and explicit fetch (empirical)', async () => {
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
    test('filterAuthorizedFetch invocation characterization', async () => {
      // Proactive push: hook count stays at 0.
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
    // consulted. So even a filter returning the empty list cannot
    // prune anything in this setup — both docs replicate via the
    // unfiltered broadcast.
    test('filterAuthorizedFetch cannot prune anything without explicit subscribers', async () => {
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

  // authorizePut(requestor, author, sedimentreeId).
  //
  // Probe what subduction surfaces as `requestor` vs `author` in a
  // 3-peer chain. The SKILL doc claims `authorizePut` is "receiver-side"
  // and gates inbound writes; this block characterizes the identities
  // visible to the receiver.
  describe('authorizePut requestor vs author in 3-peer chain', () => {
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
    test('requestor === immediate sender, author === original signer', async () => {
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
    // origin-attribution gating, IF the bridge surfaces what the test
    // above hypothesises.
    test('authorizePut deny-by-author blocks original signer even with permissive relay', async () => {
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

  // Mutation and recovery.
  //
  // Sister tests to the existing `'shareConfigChanged() retries after
  // subductionPolicy denial flips to allow'` in
  // `automerge-repo-subduction.test.ts`. Probe the recovery shape for
  // `authorizePut` deny↔allow flips and characterize what happens when
  // you flip from allow → deny mid-flight.
  describe('mutation and recovery', () => {
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
    //   3. `reconnectAdapters` retriggers the holder's push, which
    //      now passes the allowing policy and lands the doc.
    //
    // In the patched bridge (subduction.23), `lastSyncResult ===
    // 'all-failed'` IS retried on connection-generation bumps, so a
    // reconnect after the policy flip recovers the doc without needing
    // a fresh local commit. `shareConfigChanged()` alone (without a
    // reconnect) is still insufficient — it resets the heal state but
    // does not bump the connection generation, so the entry sits until
    // the heal-retry backoff fires.
    test('authorizePut deny → allow recovers on reconnect', { timeout: 20_000 }, async () => {
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

      // Flipping the policy + shareConfigChanged alone does not recover
      // within a tight window (no connection-generation bump → entry sits
      // on the heal-retry backoff).
      allowPut = true;
      host.shareConfigChanged();
      client.shareConfigChanged();
      await sleep(NEGATIVE_ASSERTION_DELAY_MS);
      expect(progress.peek().state).to.not.equal('ready');

      // Reconnect bumps the connection generation, which retriggers the
      // holder's push. Policy now allows → doc lands on the client.
      await reconnectAdapters(adapters);
      await expect
        .poll(async () => (await client.find<{ text?: string }>(handle.url)).doc()?.text, { timeout: 10_000 })
        .toEqual('gated-put');

      // Subsequent writes on the now-allowed channel must also propagate
      // (covers the original `"after-flip"` recovery path: a fresh local
      // commit still pushes successfully after the policy flip + reconnect).
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
    test('authorizePut deny → allow without shareConfigChanged() stays denied within window', async () => {
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

    // Hypothesis: flipping `authorizePut` from allow → deny on the
    // receiver blocks subsequent pushes, because every inbound commit
    // hits `authorizePut`.
    //
    // Expected: client's view of the doc stays at the pre-flip text
    // for at least the negative window.
    //
    // Implication: ✅ `authorizePut` on the receiver is the only
    // client-side hook that reliably revokes ongoing subscription
    // access. `authorizeFetch` allow→deny on the holder is NOT a
    // reliable revoke knob: a new commit triggers BOTH a batch-sync
    // round (gated by `authorizeFetch`, the denial logs as `WARN ...
    // failed to send requested data`) AND a `LooseCommit` broadcast
    // which falls back to "all_connections" with NO `authorizeFetch`
    // consultation when no peer has explicitly subscribed. The
    // `LooseCommit` path races the denial and frequently wins,
    // delivering the commit anyway. See the `subduction-policy` skill
    // for the source-level breakdown.
    test('authorizePut allow → deny blocks subsequent pushes', async () => {
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

  // Practical recipe verification.
  //
  // The SKILL doc recommends combining `authorizePut(receiver) +
  // authorizeFetch(server)` to block a peer from receiving a sedimentree.
  // These tests verify the recipe end-to-end and probe which half is
  // actually load-bearing for the DXOS (proactive-push) use case.
  describe('recipe verification', () => {
    // Hypothesis: receiver denies put + server denies fetch → doc
    // never reaches receiver via either path.
    //
    // Expected: client's findWithProgress stays out of `'ready'`.
    //
    // Implication: ✅ this is the formal recipe under the current
    // bridge. Heavy-handed but reliable.
    test('authorizePut(receiver) + authorizeFetch(server) blocks via both paths', async () => {
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
    test('authorizePut(receiver) also blocks explicit fetch', async () => {
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

  // Outbound-push negative controls.
  //
  // Lock down the headline finding: from the client's perspective,
  // there is no client-only knob (short of `authorizeConnect`) that
  // prevents a permissive server's `authorizePut` decision from being
  // the only effective inbound gate against the client's outbound push.
  describe('outbound-push negative controls', () => {
    // Hypothesis: the only effective gate against the client's
    // outbound push is the SERVER's `authorizePut`. From the client's
    // perspective, this means client-only enforcement is impossible.
    //
    // Expected: with the server denying `authorizePut` and the client
    // permissive, the client's push does NOT land at the server.
    //
    // Implication: 🚨 if cross-space pollution on the DO is intolerable,
    // the only fix is a DO-side `authorizePut` (or upstream advertise
    // hook).
    test('server-side authorizePut is the only effective gate against client outbound push', async () => {
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
