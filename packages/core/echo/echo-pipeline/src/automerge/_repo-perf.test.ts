//
// Copyright 2026 DXOS.org
//

// Standalone perf benchmark: automerge-repo's Repo with no subduction adapters
// and no networks. Just storage. Measures the cost of `change()` + `flush()` +
// `shutdown()` as a function of mutation count, isolated from DXOS code.
//
// Run with:
//   pnpx vitest run --no-file-parallelism src/automerge/_repo-perf.test.ts

import { Repo, initSubduction } from '@automerge/automerge-repo';
import { beforeAll, describe, test } from 'vitest';

import { Resource } from '@dxos/context';
import { createTestLevel } from '@dxos/kv-store/testing';
import { openAndClose } from '@dxos/test-utils';

import { LevelDBStorageAdapter } from './leveldb-storage-adapter';

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
