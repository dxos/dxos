//
// Copyright 2026 DXOS.org
//

/**
 * Characterization matrix for the `role: 'connect' | 'accept'` option on a Repo's
 * `subductionAdapters` entry.
 *
 * Each scenario:
 *   - Creates two Repo instances wired together via an in-memory NetworkAdapter pair.
 *   - Peer A uses `roleA`, peer B uses `roleB`.
 *   - Peer B is the writer — it creates the doc and mutates it.
 *   - Peer A is the reader — it always calls `findWithProgress(url)` (per spec).
 *   - We poll `progress.peek()` with a short deadline; if it never transitions to
 *     `ready`, the handshake deadlocked and no sync happens.
 *
 * This test is deliberately standalone and does NOT use {@link AutomergeHost}; it tests
 * the raw Repo + subduction-adapter behavior so the results are independent of any DXOS
 * layer and can guide future role-propagation decisions.
 */

import { MemorySigner } from '@automerge/automerge-subduction';
import {
  type AutomergeUrl,
  type Message,
  NetworkAdapter,
  type PeerId,
  type PeerMetadata,
  Repo,
} from '@automerge/automerge-repo';
import { DummyStorageAdapter } from '@automerge/automerge-repo/helpers/DummyStorageAdapter.js';
import { describe, test } from 'vitest';

const SERVICE = 'role-matrix';
const READY_DEADLINE_MS = 2_000;
const POLL_INTERVAL_MS = 20;

/**
 * Minimal bidirectional {@link NetworkAdapter}: `send()` on one side is delivered as
 * `message` on the other. Just enough to exercise the Repo ↔ subduction tunnel.
 */
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

type Role = 'connect' | 'accept';

type ScenarioResult = {
  finalState: string;
  synced: boolean;
  receivedMessage: string | undefined;
  elapsedMs: number;
};

/**
 * Run a single role permutation end-to-end.
 *
 * @param roleA - Role that peer A (the reader calling `findWithProgress`) uses.
 * @param roleB - Role that peer B (the writer) uses.
 */
const runScenario = async (roleA: Role, roleB: Role): Promise<ScenarioResult> => {
  const peerIdA = `peer-A-${roleA}-${roleB}` as PeerId;
  const peerIdB = `peer-B-${roleA}-${roleB}` as PeerId;

  const adapterA = new InMemoryAdapter(peerIdB);
  const adapterB = new InMemoryAdapter(peerIdA);
  adapterA.pair = adapterB;
  adapterB.pair = adapterA;

  const repoA = new Repo({
    peerId: peerIdA,
    signer: MemorySigner.generate(),
    storage: new DummyStorageAdapter(),
    network: [],
    subductionAdapters: [{ adapter: adapterA, serviceName: SERVICE, role: roleA }],
    sharePolicy: async () => true,
    periodicSyncInterval: 100,
    batchSyncInterval: 100,
  });

  const repoB = new Repo({
    peerId: peerIdB,
    signer: MemorySigner.generate(),
    storage: new DummyStorageAdapter(),
    network: [],
    subductionAdapters: [{ adapter: adapterB, serviceName: SERVICE, role: roleB }],
    sharePolicy: async () => true,
    periodicSyncInterval: 100,
    batchSyncInterval: 100,
  });

  try {
    // Peer B is the writer.
    const handleB = repoB.create<{ message: string }>();
    handleB.change((doc) => {
      doc.message = `synced via ${roleA}<->${roleB}`;
    });

    // Peer A is the reader — always calls `findWithProgress` per spec.
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
    const finalPeek = progress.peek();
    const synced = finalPeek.state === 'ready' && finalPeek.handle.doc()?.message !== undefined;
    const receivedMessage = finalPeek.state === 'ready' ? finalPeek.handle.doc()?.message : undefined;

    return {
      finalState: finalPeek.state,
      synced,
      receivedMessage,
      elapsedMs,
    };
  } finally {
    adapterA.disconnect();
    adapterB.disconnect();
    await repoA.shutdown();
    await repoB.shutdown();
  }
};

describe('Subduction role handshake matrix (peer A reads, peer B writes)', () => {
  test('accept <-> accept', async ({ expect }) => {
    const result = await runScenario('accept', 'accept');
    console.log('[accept<->accept]', result);
    // Expectation (hypothesis): both peers are responders, neither initiates the handshake,
    // so the transport deadlocks and peer A never sees the doc.
    expect(result.synced).toBe(false);
  });

  test('accept <-> connect', async ({ expect }) => {
    const result = await runScenario('accept', 'connect');
    console.log('[accept<->connect]', result);
    expect(result.synced).toBe(true);
    expect(result.receivedMessage).toBe('synced via accept<->connect');
  });

  test('connect <-> connect', async ({ expect }) => {
    const result = await runScenario('connect', 'connect');
    console.log('[connect<->connect]', result);
    expect(result.synced).toBe(true);
    expect(result.receivedMessage).toBe('synced via connect<->connect');
  });

  test('connect <-> accept', async ({ expect }) => {
    const result = await runScenario('connect', 'accept');
    console.log('[connect<->accept]', result);
    expect(result.synced).toBe(true);
    expect(result.receivedMessage).toBe('synced via connect<->accept');
  });
});
