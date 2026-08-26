//
// Copyright 2026 DXOS.org
//

// Injected into the node vitest project via `setupFiles` ONLY when `DX_DEBUG_LEAKS`
// is set (see vite.base.config.ts). It wraps the running suite with before/after heap
// snapshots plus a per-test `heapUsed` sample, without the test file knowing, so an
// existing suite can be leak-checked with zero edits.
// DESIGN: .agents/projects/test-profiling-leaks/DESIGN.md.

import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeHeapSnapshot } from 'node:v8';
import { afterAll, afterEach } from 'vitest';

const outDir = process.env.DX_DEBUG_LEAKS_DIR ?? './profiles';
const samplesFile = join(outDir, 'heap-samples.ndjson');

// Truncate any samples file left by a prior run in this dir (appendFileSync would otherwise
// concatenate runs and repeat `test` indices, so a slope could span unrelated captures). This
// setup file is evaluated once per test file in the fork, matching the one-suite-per-run assumption.
mkdirSync(outDir, { recursive: true });
writeFileSync(samplesFile, '');

/**
 * WASM linear memory is invisible to `heapUsed` and is never returned to the OS, so a suite whose
 * cost is mostly WASM (anything automerge-backed) reads as flat while its real footprint climbs.
 * There is no API for "how much WASM memory exists", so instances are recorded as they are
 * constructed and their `memory` exports summed on demand.
 *
 * Installed here rather than in a test helper because setup files run before the test module graph
 * is imported, which is the only point still ahead of the wasm-bindgen glue instantiating at import
 * time. Published on `globalThis` for the same reason — a setup file has no other channel to a
 * helper module. Measured against automerge: this tracks `process.memoryUsage().external` to within
 * a ~2MB constant, `external` being where V8 accounts WASM backing stores (never `arrayBuffers`).
 */
// Weak, and pruned on read: holding instances strongly would stop a discarded module's memory from
// ever being freed, so the probe would create the growth it claims to measure.
//
// Registry and proxy live on `globalThis`, installed once. This setup file is evaluated per test
// FILE, but `DX_DEBUG_LEAKS` runs the fork non-isolated, so a second file shares a process in which
// the wasm-bindgen glue has already instantiated — a fresh per-file registry would see none of it
// and report zero.
const REGISTRY_KEY = '__DXOS_WASM_REGISTRY__';
const globals = globalThis as Record<string, unknown>;
const wasmInstances = (globals[REGISTRY_KEY] ??= []) as WeakRef<WebAssembly.Instance>[];

if (globals.__DXOS_WASM_BYTES__ === undefined) {
  const OriginalInstance = WebAssembly.Instance;
  WebAssembly.Instance = new Proxy(OriginalInstance, {
    construct: (target, args) => {
      const instance = Reflect.construct(target, args) as WebAssembly.Instance;
      wasmInstances.push(new WeakRef(instance));
      return instance;
    },
  });
}

const wasmBytes = (): number => {
  let total = 0;
  for (let index = wasmInstances.length - 1; index >= 0; index--) {
    const instance = wasmInstances[index].deref();
    if (instance === undefined) {
      wasmInstances.splice(index, 1);
      continue;
    }
    const memory = instance.exports?.memory as WebAssembly.Memory | undefined;
    total += memory?.buffer?.byteLength ?? 0;
  }
  return total;
};

globals.__DXOS_WASM_BYTES__ = wasmBytes;
// Instance count alongside the total, so a large figure can be read as one module's growth rather
// than mistaken for many modules each holding a little.
globals.__DXOS_WASM_INSTANCES__ = (): number => {
  wasmBytes();
  return wasmInstances.length;
};

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

// Vitest's 10s hook default timed out on a suite whose heap is large enough to be worth snapshotting
// — repeated collection plus `writeHeapSnapshot` of a multi-GB heap is minutes of work on a loaded
// runner, and the timeout failed the file no matter what its assertions said.
const SNAPSHOT_TIMEOUT = 300_000;

// After each test: settle, then record `heapUsed`. Growth across a multi-test suite in one process
// is the monotonicity signal — vitest 4 dropped the config-level `repeats` knob, so amplification
// comes from the suite's own test count rather than a rerun loop. The baseline snapshot is taken
// AFTER the first test, not at process start, so first-run lazy init (module singletons, V8 code
// compilation, string interning) is not mistaken for a leak.
afterEach(async () => {
  await settle();
  const heapUsed = process.memoryUsage().heapUsed;
  appendFileSync(samplesFile, JSON.stringify({ test: ++completed, heapUsed, wasmBytes: wasmBytes() }) + '\n');
  if (completed === 1) {
    snapshot('before.heapsnapshot');
  }
}, SNAPSHOT_TIMEOUT);

afterAll(async () => {
  await settle();
  snapshot('after.heapsnapshot');
}, SNAPSHOT_TIMEOUT);
