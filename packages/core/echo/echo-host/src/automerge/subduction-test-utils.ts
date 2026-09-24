//
// Copyright 2026 DXOS.org
//

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
  parseAutomergeUrl,
} from '@automerge/automerge-repo';
import { type MemorySigner, SedimentreeId } from '@automerge/automerge-subduction';
import { onTestFinished } from 'vitest';

import { Trigger, asyncTimeout } from '@dxos/async';
import { isNonNullable } from '@dxos/util';

import { TestAdapter, type TestConnectionStateProvider, createTestSqliteStorageAdapter } from '../testing/index.ts';

export const HOST_AND_CLIENT: [string, string] = ['host', 'client'];
export const SUBDUCTION_SERVICE_NAME = 'test-subduction-service';

export type QueryStateName = QueryState<unknown>['state'];

export const FIND_STATES: readonly QueryStateName[] = ['ready', 'loading'];

/**
 * Window for an assertion that waits on subduction doing its work.
 *
 * Every such wait is event-driven or polled, so this is a ceiling on how long a stuck sync takes to
 * report, never time the suite spends when healthy — a passing wait returns as soon as its condition
 * holds. It was 5 s, which is only ~2x the slowest test in the suite (2.5 s including teardown), and
 * CI blew through it three times in one day on a loaded shard: the failures landed at 5.17-5.22 s,
 * i.e. exactly this budget rather than the thing under test. 15 s restores real headroom while still
 * failing well inside the job.
 */
export const SYNC_WINDOW_MS = 15_000;

/**
 * Window for the handful of negative tests whose subject is that NOTHING happens — no transport at
 * all, or no handshake to observe — so there is no event to wait on and the window IS the
 * assertion. Every other negative assertion waits for the refusal itself; see {@link createDenyGate}.
 */
export const NO_TRAFFIC_WINDOW_MS = 500;

// Subduction control-plane message type, sent by `NetworkAdapterTransport` from
// `@automerge/automerge-repo/dist/subduction/network.js`. Not exported from the
// package root, so we inline the string literal. If you change this, also update
// `node_modules/.../subduction/network.d.ts:SUBDUCTION_MESSAGE_TYPE`.
export const SUBDUCTION_MESSAGE_TYPE = 'subduction-connection';

/**
 * A policy denial that latches when it fires.
 *
 * Lets a negative assertion rest on the refusal having happened — the peer asked and was told no —
 * instead of on a guessed delay that is either too short on a loaded box or wasted time on an idle
 * one. It also fails loudly if the denial never fires, where a sleep would have passed vacuously.
 */
export const createDenyGate = (message = 'denied') => {
  const refused = new Trigger();
  return {
    /** Body for a policy hook: latches the refusal, then refuses. */
    deny: (): never => {
      refused.wake();
      throw new Error(message);
    },
    /** Same, for a predicate that denies by returning `false` rather than throwing. */
    refuse: (): boolean => {
      refused.wake();
      return false;
    },
    /** Resolve as soon as the gate has refused. */
    waitForDenial: (): Promise<void> => refused.wait({ timeout: SYNC_WINDOW_MS }),
  };
};

export const waitForQueryState = async <T>(
  progress: DocumentProgress<T>,
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

/**
 * Read a document's contents from `repo`'s handle cache without issuing a query.
 *
 * After a deliberate policy denial the query has already settled `unavailable`, and `repo.find()`
 * rejects from then on however many times it is polled; the handle still updates when the holder's
 * re-driven push finally lands.
 */
export const peekDoc = <T>(repo: Repo, url: AutomergeUrl): T | undefined =>
  (repo.handles[parseAutomergeUrl(url).documentId] as DocHandle<T> | undefined)?.doc();

export const findInStates = async <T>(
  repo: Repo,
  url: AutomergeUrl,
  awaitStates: readonly QueryStateName[] = ['ready'],
  { timeout }: { timeout?: number } = {},
): Promise<DocHandle<T>> => {
  const { documentId } = parseAutomergeUrl(url);
  const progress = repo.findWithProgress<T>(url);
  await waitForQueryState(progress, awaitStates, { timeout });
  return repo.handles[documentId] as DocHandle<T>;
};

type ShareConfig = Exclude<ConstructorParameters<typeof Repo>[0], undefined>['shareConfig'];

export type ConnectedRepoOptions = {
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
  /** Per-connection transport gates, keyed by index into `connections`; overrides `connectionStateProvider`. */
  connectionStateProviderByConnection?: Record<number, TestConnectionStateProvider>;
  subductionTimeouts?: NonNullable<ConstructorParameters<typeof Repo>[0]>['subductionTimeouts'];
  subductionMaxResidentTrees?: number;
};

export const createRepoTopology = async <Peers extends string[], Peer extends string = Peers[number]>(args: {
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
    return TestAdapter.createPair(
      args.options?.connectionStateProviderByConnection?.[idx] ?? args.options?.connectionStateProvider,
      handler,
    ) as [TestAdapter, TestAdapter];
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
        ...(args.options?.subductionTimeouts ? { subductionTimeouts: args.options.subductionTimeouts } : {}),
        subductionMaxResidentTrees: args.options?.subductionMaxResidentTrees,
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
    // Drop the peers before shutdown: `SubductionSource.shutdown()` runs a final sync round bounded
    // by a hard-coded 5 s `SHUTDOWN_SYNC_TIMEOUT_MS`, and with both ends tearing down concurrently
    // that round always burns the full 5 s, leaving every positive assertion no headroom under CI.
    disconnectAdapters(adapters);
    await Promise.all(repos.map((repo) => shutdownRepo(repo)));
  });
  const repoPairs = args.connections.map(
    ([left, right]) => [repos[args.peers.indexOf(left)], repos[args.peers.indexOf(right)]] as [Repo, Repo],
  );
  return { repos, adapters, repoPairs };
};

export const createHostClientRepoTopology = (options?: ConnectedRepoOptions) =>
  createRepoTopology({
    peers: HOST_AND_CLIENT,
    connections: [HOST_AND_CLIENT],
    options,
  });

/**
 * 3-peer star topology: `client` in the center, connected to both
 * `server1` and `server2`. The two servers are NOT connected to each
 * other. Used to probe per-peer policy granularity (does the bridge let
 * us deny just one server?).
 */
export const createStarTopology = (options?: ConnectedRepoOptions) =>
  createRepoTopology({
    peers: ['client', 'server1', 'server2'],
    connections: [
      ['client', 'server1'],
      ['client', 'server2'],
    ],
    options,
  });

/**
 * Arm a per-pair handshake barrier, before any candidate goes out — a fast handshake would
 * otherwise bind before the listener attached.
 *
 * Only the side that verifies the peer emits `subduction-peer-bound`, so a pair is bound once
 * EITHER of its repos reports — but every pair must report, or a later fetch can reach a still
 * unbound pair, settle success-empty, and never be re-asked.
 */
const armBindings = (repoPairs: [Repo, Repo][]): Promise<unknown>[] =>
  repoPairs.map((pair) =>
    Promise.race(
      pair.map((repo) => {
        const bound = new Trigger();
        repo.once('subduction-peer-bound', () => bound.wake());
        return bound.wait();
      }),
    ),
  );

export const connectAdapters = async (
  pairs: [TestAdapter, TestAdapter][],
  options?: { noEmitPeerCandidate?: boolean; repoPairs?: [Repo, Repo][] },
) => {
  // `peer-candidate` only STARTS the handshake. A test whose data already exists must wait for it
  // to bind: a fetch issued first settles success-empty and subduction never re-asks, so the doc
  // never arrives. Opt-in per pair, because a test that denies `authorizeConnect` never binds.
  const bound = options?.repoPairs && armBindings(options.repoPairs);
  for (const pair of pairs) {
    await pair[0].onConnect.wait();
    await pair[1].onConnect.wait();
    if (!options?.noEmitPeerCandidate) {
      pair[0].peerCandidate(pair[1].peerId!);
      pair[1].peerCandidate(pair[0].peerId!);
    }
  }
  if (bound) {
    await asyncTimeout(Promise.all(bound), SYNC_WINDOW_MS);
  }
};

export const disconnectAdapters = (pairs: [TestAdapter, TestAdapter][]) => {
  for (const [left, right] of pairs) {
    if (left.peerId && right.peerId) {
      left.peerDisconnected(right.peerId);
      right.peerDisconnected(left.peerId);
    }
    left.disconnect();
    right.disconnect();
  }
};

export const reconnectAdapters = async (
  pairs: [TestAdapter, TestAdapter][],
  options?: { repoPairs?: [Repo, Repo][] },
) => {
  // Same handshake barrier as `connectAdapters`: the candidate only starts the new handshake, and a
  // fetch — or a `shareConfigChanged()` kick — issued before it binds sees no peers and settles.
  const bound = options?.repoPairs && armBindings(options.repoPairs);
  for (const pair of pairs) {
    pair[0].peerDisconnected(pair[1].peerId!);
    pair[1].peerDisconnected(pair[0].peerId!);
    pair[0].peerCandidate(pair[1].peerId!);
    pair[1].peerCandidate(pair[0].peerId!);
  }
  if (bound) {
    await asyncTimeout(Promise.all(bound), SYNC_WINDOW_MS);
  }
};

export const shutdownRepo = async (repo: Repo) => {
  await repo.shutdown().catch(() => {});
};

export const createRepo = (
  options?: ConstructorParameters<typeof Repo>[0],
  cleanupOptions: { registerCleanup?: boolean } = {},
) => {
  const repo = new Repo({
    // Reduce sync timeout so inflight syncWithAllPeers fails fast when a relay
    // peer does not yet have the document; self-healing retries kick in quickly.
    subductionTimeouts: {
      syncMs: 500,
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

/**
 * Barrier for "every pending subduction commit is durable and serveable".
 *
 * `Repo.flush()` forces the throttled subduction save and waits for the storage-bridge write. A
 * peer fetch that races an unflushed save settles success-empty with nothing to re-ask, so that
 * miss is permanent (`Document <id> is unavailable`, a push that never fires) rather than slow.
 *
 * Deliberately says nothing about delivery: a positive assertion polls the receiver until the doc
 * lands, and a negative one latches on the refusal ({@link createDenyGate}), so neither needs a
 * guessed settle window.
 */
export const waitForSubductionSave = async (repos: Repo[]): Promise<void> => {
  await Promise.all(repos.map((repo) => repo.flush()));
};

export const createSqliteAdapter = async (filename = ':memory:') => {
  const { adapter, dispose } = await createTestSqliteStorageAdapter(filename);
  onTestFinished(dispose);
  return adapter;
};

// ── Policy helpers ────────────────────────────────────────────────────────
//
// `SubductionPolicy` is just an object of four async hooks. The helpers below
// wrap that minimal shape with closure-captured behaviour so individual tests
// can express "deny these sedimentrees", "deny these requestors", or "count
// hook invocations" without re-stating the boilerplate four-hook object every
// time. None of these helpers add new behaviour beyond what the upstream
// `Policy` interface allows; they exist only to keep test bodies readable.

export type HookName = 'authorizeConnect' | 'authorizeFetch' | 'authorizePut' | 'filterAuthorizedFetch';

export const PERMISSIVE_POLICY: SubductionPolicy = {
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
export const createCountingPolicy = (
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
export const documentIdToSedimentreeIdString = (documentId: DocumentId): string => {
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
export const denyExceptSedimentrees = (
  allow: Set<string>,
  hook: 'authorizePut' | 'authorizeFetch',
): SubductionPolicy => {
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
 * peer-identity key; change to `author` if/when a test requires it.
 */
export const denyPeers = (
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
