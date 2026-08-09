//
// Copyright 2026 DXOS.org
//

// Injected into the node vitest project via `setupFiles` ONLY when `DX_DEBUG_LEAKS`
// is set (see vite.base.config.ts). It wraps the running suite with before/after heap
// snapshots plus a per-test `heapUsed` sample, without the test file knowing, so an
// existing suite can be leak-checked with zero edits.
// DESIGN: .agents/projects/test-profiling-leaks/DESIGN.md.

import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { writeHeapSnapshot } from 'node:v8';
import { afterAll, afterEach } from 'vitest';

const outDir = process.env.DX_DEBUG_LEAKS_DIR ?? './profiles';

// `--expose-gc` (added to the fork's execArgv when DX_DEBUG_LEAKS is set) is what makes `global.gc`
// callable; without it the snapshots still write but retain garbage, so the deltas are meaningless.
if (typeof global.gc !== 'function') {
  console.warn(
    '[leak-setup] global.gc is unavailable — run via `DX_DEBUG_LEAKS=1 moon run <pkg>:test -- <file>` so --expose-gc is set.',
  );
}

// Force GC repeatedly with a macrotask turn between passes so FinalizationRegistry callbacks,
// WeakRef clears, and pending microtasks flush before a snapshot or heap reading is taken.
const settle = async (): Promise<void> => {
  for (let iteration = 0; iteration < 3; iteration++) {
    global.gc?.();
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const snapshot = (name: string): void => {
  mkdirSync(outDir, { recursive: true });
  const file = writeHeapSnapshot(join(outDir, name));
  console.log(`[leak-setup] wrote ${file}`);
};

let completed = 0;

// After each test: settle, then record `heapUsed`. Growth across a multi-test suite in one process
// is the monotonicity signal — vitest 4 dropped the config-level `repeats` knob, so amplification
// comes from the suite's own test count rather than a rerun loop. The baseline snapshot is taken
// AFTER the first test, not at process start, so first-run lazy init (module singletons, V8 code
// compilation, string interning) is not mistaken for a leak.
afterEach(async () => {
  await settle();
  const heapUsed = process.memoryUsage().heapUsed;
  mkdirSync(outDir, { recursive: true });
  appendFileSync(join(outDir, 'heap-samples.ndjson'), JSON.stringify({ test: ++completed, heapUsed }) + '\n');
  if (completed === 1) {
    snapshot('before.heapsnapshot');
  }
});

afterAll(async () => {
  await settle();
  snapshot('after.heapsnapshot');
});
