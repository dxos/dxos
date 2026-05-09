//
// Copyright 2026 DXOS.org
//

// Standalone perf benchmark: automerge-repo's Repo with no subduction adapters
// and no networks. Just storage. Measures the cost of `change()` + `flush()` +
// `shutdown()` as a function of mutation count, isolated from DXOS code.
//
// Run with:
//   pnpx vitest run --no-file-parallelism src/automerge/_repo-perf.test.ts

import { Repo, initSubduction, parseAutomergeUrl, type PeerId } from '@automerge/automerge-repo';
import { beforeAll, describe, expect, test } from 'vitest';

import { Resource } from '@dxos/context';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { TestAdapter } from '../testing';
import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

const SUBDUCTION_SERVICE_NAME = 'repo-perf-subduction';

beforeAll(async () => {
  await initSubduction();
});

class StorageHarness extends Resource {
  storage!: LevelDBStorageAdapter;
  constructor(private readonly _kv: ReturnType<typeof createTestLevel>) {
    super();
  }
  protected override async _open(): Promise<void> {
    this.storage = new LevelDBStorageAdapter({ db: this._kv.sublevel('automerge') });
    await this.storage.open();
  }
  protected override async _close(): Promise<void> {
    await this.storage.close();
  }
}

const measure = async (label: string, mutationCount: number) => {
  const kv = createTestLevel();
  await openAndClose(kv);
  const harness = new StorageHarness(kv);
  await openAndClose(harness);

  const tCreate0 = performance.now();
  const repo = new Repo({
    storage: harness.storage,
    network: [],
  });
  const tCreate1 = performance.now();

  const handle = repo.create<{ count: number }>({ count: 0 });
  await handle.whenReady();
  const tDocReady = performance.now();

  for (let i = 1; i <= mutationCount; i++) {
    handle.change((doc) => {
      doc.count = i;
    });
  }
  const tMutated = performance.now();

  await repo.flush();
  const tFlushed = performance.now();

  await repo.shutdown();
  const tShutdown = performance.now();

  console.log(
    `[${label.padEnd(8)}] mutations=${String(mutationCount).padStart(5)}  ` +
      `repo.new=${(tCreate1 - tCreate0).toFixed(0).padStart(4)}ms  ` +
      `create+ready=${(tDocReady - tCreate1).toFixed(0).padStart(4)}ms  ` +
      `mutate=${(tMutated - tDocReady).toFixed(0).padStart(4)}ms  ` +
      `flush=${(tFlushed - tMutated).toFixed(0).padStart(5)}ms  ` +
      `shutdown=${(tShutdown - tFlushed).toFixed(0).padStart(5)}ms  ` +
      `TOTAL=${(tShutdown - tCreate0).toFixed(0).padStart(5)}ms`,
  );
};

describe('automerge-repo perf (no subduction adapters)', () => {
  test('mutation count scaling', { timeout: 120_000 }, async () => {
    // Warm up (init subduction WASM, JIT, etc.)
    await measure('warmup', 10);
    console.log('---');
    for (const n of [10, 100, 500, 1000, 2000, 5000]) {
      await measure(`bench`, n);
    }
  });
});

const createStorage = async () => {
  const kv = createTestLevel();
  await openAndClose(kv);
  const harness = new StorageHarness(kv);
  await openAndClose(harness);
  return harness.storage;
};

const createSubductionRepo = async (peerId: string, adapters: TestAdapter[]) =>
  new Repo({
    peerId: peerId as PeerId,
    storage: await createStorage(),
    network: [],
    subductionTimeouts: {
      syncMs: 2_000,
      healInitialDelayMs: 100,
    },
    subductionAdapters: adapters.map((adapter) => ({
      adapter,
      serviceName: SUBDUCTION_SERVICE_NAME,
      role: 'connect' as const,
    })),
  });

const connectAdapters = async (pairs: [TestAdapter, TestAdapter][]) => {
  for (const [left, right] of pairs) {
    await left.onConnect.wait();
    await right.onConnect.wait();
    left.peerCandidate(right.peerId!);
    right.peerCandidate(left.peerId!);
  }
};

const measureSubductionShutdown = async (label: string, { flushBeforeShutdown }: { flushBeforeShutdown: boolean }) => {
  const pairs = [
    TestAdapter.createPair() as [TestAdapter, TestAdapter],
    TestAdapter.createPair() as [TestAdapter, TestAdapter],
    TestAdapter.createPair() as [TestAdapter, TestAdapter],
  ];
  const [repoA, repoB, repoC, repoD] = await Promise.all([
    createSubductionRepo('A', [pairs[0][0]]),
    createSubductionRepo('B', [pairs[0][1], pairs[1][0]]),
    createSubductionRepo('C', [pairs[1][1], pairs[2][0]]),
    createSubductionRepo('D', [pairs[2][1]]),
  ]);
  await connectAdapters(pairs);

  const docA = repoA.create<{ text?: string }>();
  docA.change((doc) => {
    doc.text = 'Hello world';
  });

  repoB.findWithProgress<{ text?: string }>(docA.url);
  repoC.findWithProgress<{ text?: string }>(docA.url);
  repoD.findWithProgress<{ text?: string }>(docA.url);
  const { documentId } = parseAutomergeUrl(docA.url);
  const handleD = repoD.handles[documentId];
  await expect.poll(() => handleD.doc()?.text, { timeout: 10_000 }).toEqual('Hello world');

  const tFlush0 = performance.now();
  if (flushBeforeShutdown) {
    await Promise.all([repoA.flush(), repoB.flush(), repoC.flush(), repoD.flush()]);
  }
  const tFlush1 = performance.now();

  const tShutdown0 = performance.now();
  const shutdown = (async () => {
    if (!flushBeforeShutdown) {
      await Promise.all([repoA.flush(), repoB.flush(), repoC.flush(), repoD.flush()]);
    }
    await Promise.all([repoA.shutdown(), repoB.shutdown(), repoC.shutdown(), repoD.shutdown()]);
  })();
  await expect(
    Promise.race([
      shutdown,
      new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`shutdown did not settle in 5s (${label}, flushBeforeShutdown=${flushBeforeShutdown})`)),
          5_000,
        ),
      ),
    ]),
  ).resolves.toBeUndefined();
  const tShutdown1 = performance.now();

  console.log(
    `[${label.padEnd(8)}] topology=4-peer-chain  ` +
      `preflush=${String(flushBeforeShutdown).padEnd(5)}  ` +
      `flush=${(tFlush1 - tFlush0).toFixed(0).padStart(5)}ms  ` +
      `shutdown=${(tShutdown1 - tShutdown0).toFixed(0).padStart(5)}ms`,
  );
};

describe('automerge-repo perf (subduction adapters)', () => {
  test('shutdown after flushed replicated chain', { timeout: 60_000 }, async () => {
    await measureSubductionShutdown('subduct', { flushBeforeShutdown: true });
  });

  test('shutdown helper flushes dirty replicated chain', { timeout: 60_000 }, async () => {
    await measureSubductionShutdown('helper', { flushBeforeShutdown: false });
  });
});
