//
// Copyright 2026 DXOS.org
//

/**
 * Characterization: how does subduction interact with `Repo({ shareConfig })` /
 * `Repo({ sharePolicy })`?
 *
 * Short answer — empirically demonstrated by this test:
 *   **Subduction replication ignores `shareConfig` entirely.**
 *
 * The classical `CollectionSynchronizer` / `DocSynchronizer` path consults
 * `shareConfig.announce` and `.access` inside
 * `@automerge/automerge-repo/src/synchronizer/DocSynchronizer.ts#resolveSharePolicy`.
 * Subduction's `SubductionSource` (in `src/subduction/source.ts`) does not. If a doc
 * gets created on one peer and the two peers are connected via `subductionAdapters`,
 * the doc replicates regardless of whether `shareConfig.announce` returns `false` or
 * throws.
 *
 * Subduction has its own policy layer: `Repo({ subductionPolicy })` — see the
 * `@automerge/automerge-subduction` `Policy` interface (`authorizeConnect`,
 * `authorizeFetch`, `authorizePut`, `filterAuthorizedFetch`). That is the correct
 * hook for subduction-era access control; this test does not exercise it.
 *
 * Scenarios:
 *   1. Baseline — default shareConfig, subduction adapters → doc replicates.
 *   2. `announce: always false` — still replicates over subduction (proof that shareConfig is not consulted).
 *   3. `access: always false` + `announce: always false` — still replicates over subduction.
 *   4. `sharePolicy: always false` (legacy alias for `announce`) — still replicates.
 *   5. `announce: throws` — still replicates; subduction has no coupling.
 *
 * These tests live alongside `subduction-role-matrix.test.ts` as permanent regression
 * guards so any future change to how Repo wires shareConfig (or to subduction gaining a
 * bridge into it) flips these expectations and surfaces immediately.
 */

import { MemorySigner } from '@automerge/automerge-subduction';
import {
  type AutomergeUrl,
  type Message,
  NetworkAdapter,
  type PeerId,
  type PeerMetadata,
  Repo,
  type ShareConfig,
  type SharePolicy,
} from '@automerge/automerge-repo';
import { DummyStorageAdapter } from '@automerge/automerge-repo/helpers/DummyStorageAdapter.js';
import { describe, test } from 'vitest';

const SERVICE = 'share-policy';
const READY_DEADLINE_MS = 2_000;
const POLL_INTERVAL_MS = 20;

/** Bidirectional in-memory NetworkAdapter pair (mirror of subduction-role-matrix.test.ts). */
class InMemoryAdapter extends NetworkAdapter {
  pair!: InMemoryAdapter;

  constructor(private readonly _remotePeerId: PeerId) {
    super();
  }

  override isReady(): boolean {
    return true;
  }

  override whenReady(): Promise<void> {
    return Promise.resolve();
  }

  override connect(peerId: PeerId, _metadata?: PeerMetadata): void {
    this.peerId = peerId;
    queueMicrotask(() => {
      this.emit('peer-candidate', { peerId: this._remotePeerId, peerMetadata: {} });
    });
  }

  override send(message: Message): void {
    queueMicrotask(() => this.pair.emit('message', message));
  }

  override disconnect(): void {
    this.emit('close');
  }
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type ShareOverrides =
  | { shareConfig: ShareConfig; sharePolicy?: undefined }
  | { shareConfig?: undefined; sharePolicy: SharePolicy }
  | { shareConfig?: undefined; sharePolicy?: undefined };

type ScenarioResult = {
  synced: boolean;
  receivedMessage: string | undefined;
  elapsedMs: number;
  announceCallCount: number;
  accessCallCount: number;
};

/**
 * Boot two Repos wired via in-memory subduction adapters, have peer B create + mutate a
 * doc, and measure whether peer A's `findWithProgress` becomes `ready`.
 *
 * `overrides.peerA*` and `overrides.peerB*` let individual cases pin down which side is
 * intended to veto sharing; we use this to prove that subduction ignores the veto.
 *
 * Also counts how many times the supplied `announce` / `access` functions were called so
 * we can assert that subduction does NOT invoke them for doc replication (classical sync's
 * DocSynchronizer may still call them as part of the synchronizer wiring — we tolerate
 * non-zero counts).
 */
const runScenario = async (overrides: {
  peerA?: ShareOverrides;
  peerB?: ShareOverrides;
}): Promise<ScenarioResult> => {
  const peerIdA = `peer-A-${Math.random().toString(36).slice(2, 6)}` as PeerId;
  const peerIdB = `peer-B-${Math.random().toString(36).slice(2, 6)}` as PeerId;

  const adapterA = new InMemoryAdapter(peerIdB);
  const adapterB = new InMemoryAdapter(peerIdA);
  adapterA.pair = adapterB;
  adapterB.pair = adapterA;

  let announceCallCount = 0;
  let accessCallCount = 0;

  // Instrumented wrappers so a scenario that hands us a policy of "false" also
  // increments the counters.
  const instrumentShareConfig = (cfg: ShareConfig): ShareConfig => ({
    announce: async (peerId, documentId) => {
      announceCallCount++;
      return cfg.announce(peerId, documentId);
    },
    access: async (peerId, documentId) => {
      accessCallCount++;
      return cfg.access(peerId, documentId);
    },
  });

  const instrumentSharePolicy = (policy: SharePolicy): SharePolicy => {
    return async (peerId, documentId) => {
      announceCallCount++;
      return policy(peerId, documentId);
    };
  };

  const resolveOverrides = (raw: ShareOverrides | undefined) => {
    if (!raw) {
      return {};
    }
    if ('shareConfig' in raw && raw.shareConfig) {
      return { shareConfig: instrumentShareConfig(raw.shareConfig) };
    }
    if ('sharePolicy' in raw && raw.sharePolicy) {
      return { sharePolicy: instrumentSharePolicy(raw.sharePolicy) };
    }
    return {};
  };

  const repoA = new Repo({
    peerId: peerIdA,
    signer: MemorySigner.generate(),
    storage: new DummyStorageAdapter(),
    network: [],
    subductionAdapters: [{ adapter: adapterA, serviceName: SERVICE, role: 'connect' }],
    periodicSyncInterval: 100,
    batchSyncInterval: 100,
    ...resolveOverrides(overrides.peerA),
  });

  const repoB = new Repo({
    peerId: peerIdB,
    signer: MemorySigner.generate(),
    storage: new DummyStorageAdapter(),
    network: [],
    subductionAdapters: [{ adapter: adapterB, serviceName: SERVICE, role: 'connect' }],
    periodicSyncInterval: 100,
    batchSyncInterval: 100,
    ...resolveOverrides(overrides.peerB),
  });

  try {
    const handleB = repoB.create<{ message: string }>();
    handleB.change((doc) => {
      doc.message = 'shared via subduction';
    });

    const started = performance.now();
    const progress = repoA.findWithProgress<{ message: string }>(handleB.url as AutomergeUrl);

    const deadline = Date.now() + READY_DEADLINE_MS;
    while (Date.now() < deadline) {
      const state = progress.peek();
      if (state.state === 'ready' && state.handle.doc()?.message !== undefined) {
        break;
      }
      await pause(POLL_INTERVAL_MS);
    }

    const elapsedMs = Math.round(performance.now() - started);
    const peek = progress.peek();
    const synced = peek.state === 'ready' && peek.handle.doc()?.message !== undefined;
    const receivedMessage = peek.state === 'ready' ? peek.handle.doc()?.message : undefined;

    return { synced, receivedMessage, elapsedMs, announceCallCount, accessCallCount };
  } finally {
    adapterA.disconnect();
    adapterB.disconnect();
    await repoA.shutdown();
    await repoB.shutdown();
  }
};

const denyAllShareConfig: ShareConfig = {
  announce: async () => false,
  access: async () => false,
};

const denyAnnounceOnlyShareConfig: ShareConfig = {
  announce: async () => false,
  access: async () => true,
};

const throwingShareConfig: ShareConfig = {
  announce: async () => {
    throw new Error('shareConfig.announce intentionally throws — subduction must not rely on it');
  },
  access: async () => false,
};

describe('Subduction replication vs shareConfig / sharePolicy', () => {
  test('baseline: default shareConfig — subduction replicates', async ({ expect }) => {
    const result = await runScenario({});
    console.log('[baseline]', result);
    expect(result.synced).toBe(true);
    expect(result.receivedMessage).toBe('shared via subduction');
  });

  test('shareConfig announce=false on both sides — subduction still replicates', async ({ expect }) => {
    const result = await runScenario({
      peerA: { shareConfig: denyAnnounceOnlyShareConfig },
      peerB: { shareConfig: denyAnnounceOnlyShareConfig },
    });
    console.log('[announce=false both]', result);
    expect(result.synced).toBe(true);
  });

  test('shareConfig deny-all on both sides — subduction still replicates', async ({ expect }) => {
    const result = await runScenario({
      peerA: { shareConfig: denyAllShareConfig },
      peerB: { shareConfig: denyAllShareConfig },
    });
    console.log('[deny-all both]', result);
    expect(result.synced).toBe(true);
  });

  test('legacy sharePolicy=false on both sides — subduction still replicates', async ({ expect }) => {
    const denyAll: SharePolicy = async () => false;
    const result = await runScenario({
      peerA: { sharePolicy: denyAll },
      peerB: { sharePolicy: denyAll },
    });
    console.log('[sharePolicy=false both]', result);
    expect(result.synced).toBe(true);
  });

  test('shareConfig announce throws — subduction replicates; error never crosses into subduction path', async ({
    expect,
  }) => {
    const result = await runScenario({
      peerA: { shareConfig: throwingShareConfig },
      peerB: { shareConfig: throwingShareConfig },
    });
    console.log('[announce throws]', result);
    expect(result.synced).toBe(true);
  });
});
