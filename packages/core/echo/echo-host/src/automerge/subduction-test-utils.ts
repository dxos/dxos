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

import { Trigger, sleep } from '@dxos/async';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';
import { isNonNullable } from '@dxos/util';

import { TestAdapter, type TestConnectionStateProvider } from '../testing';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

export const HOST_AND_CLIENT: [string, string] = ['host', 'client'];
export const SUBDUCTION_SERVICE_NAME = 'test-subduction-service';

export type QueryStateName = QueryState<unknown>['state'];

export const FIND_STATES: readonly QueryStateName[] = ['ready', 'loading'];

// How long to wait before asserting "this should NOT have happened by now".
// Tuned so that:
//   - The happy path (basic subduction sync) consistently completes faster:
//     observed end-to-end ~200-300 ms locally.
//   - The window is short enough to keep the suite fast.
//   - It's long enough that GC pauses or scheduling jitter on a busy CI box
//     don't sneak a successful sync past the assertion.
// If you find yourself raising this, write down WHY in the test that needs
// more time rather than bumping the global.
export const NEGATIVE_ASSERTION_DELAY_MS = 500;

// Subduction control-plane message type, sent by `NetworkAdapterTransport` from
// `@automerge/automerge-repo/dist/subduction/network.js`. Not exported from the
// package root, so we inline the string literal. If you change this, also update
// `node_modules/.../subduction/network.d.ts:SUBDUCTION_MESSAGE_TYPE`.
export const SUBDUCTION_MESSAGE_TYPE = 'subduction-connection';

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

export const findInStates = async <T>(
  repo: Repo,
  url: AutomergeUrl,
  awaitStates: readonly QueryStateName[] = ['ready'],
): Promise<DocHandle<T>> => {
  const { documentId } = parseAutomergeUrl(url);
  const progress = repo.findWithProgress<T>(url);
  await waitForQueryState(progress, awaitStates);
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

export const connectAdapters = async (
  pairs: [TestAdapter, TestAdapter][],
  options?: { noEmitPeerCandidate?: boolean },
) => {
  for (const pair of pairs) {
    await pair[0].onConnect.wait();
    await pair[1].onConnect.wait();
    if (!options?.noEmitPeerCandidate) {
      pair[0].peerCandidate(pair[1].peerId!);
      pair[1].peerCandidate(pair[0].peerId!);
    }
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

export const reconnectAdapters = async (pairs: [TestAdapter, TestAdapter][]) => {
  for (const pair of pairs) {
    pair[0].peerDisconnected(pair[1].peerId!);
    pair[1].peerDisconnected(pair[0].peerId!);
    pair[0].peerCandidate(pair[1].peerId!);
    pair[1].peerCandidate(pair[0].peerId!);
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

export const waitForSubductionSave = async () => {
  await sleep(150);
};

export const createLevelAdapter = async (level = createTestLevel()) => {
  const storage = new LevelDBStorageAdapter({ db: level.sublevel('automerge') });
  await openAndClose(level, storage);
  return storage;
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
