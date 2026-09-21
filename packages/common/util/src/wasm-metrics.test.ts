//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { getWasmMemoryStats, installWasmMemoryProbe } from './wasm-metrics.ts';

/**
 * The smallest valid module that exports one page of memory, written out rather than compiled:
 * the probe's whole job is to notice an exported `WebAssembly.Memory`, and a fixture that needs a
 * toolchain to produce would put that behind a build step.
 */
const MODULE_HEX =
  '0061736d01000000' + // magic, version
  '0503010001' + // memory section: one memory, minimum one page
  '070a01066d656d6f72790200'; // export section: "memory"

const MEMORY_MODULE = Uint8Array.from(MODULE_HEX.match(/../g) ?? [], (byte) => parseInt(byte, 16));

const PAGE_BYTES = 64 * 1024;

describe('wasm memory probe', () => {
  test('counts an exported memory, and its growth', async ({ expect }) => {
    installWasmMemoryProbe();
    const before = getWasmMemoryStats();

    const { instance } = await WebAssembly.instantiate(MEMORY_MODULE.buffer);
    const memory = instance.exports.memory;
    expect(memory).toBeInstanceOf(WebAssembly.Memory);

    const instantiated = getWasmMemoryStats();
    expect(instantiated.instances).toBe(before.instances + 1);
    expect(instantiated.bytes).toBe(before.bytes + PAGE_BYTES);

    // Linear memory only grows, and `buffer` is replaced when it does — the reason the stats read
    // `byteLength` at every call rather than remembering the size at instantiation.
    if (memory instanceof WebAssembly.Memory) {
      memory.grow(2);
    }
    expect(getWasmMemoryStats().bytes).toBe(before.bytes + 3 * PAGE_BYTES);
  });

  test('counts a memory passed in through the imports', async ({ expect }) => {
    installWasmMemoryProbe();
    const before = getWasmMemoryStats();

    // A module can take its memory instead of exporting one, which an Emscripten build with
    // pthreads does; that memory never appears on `instance.exports`.
    const imported = new WebAssembly.Memory({ initial: 4 });
    await WebAssembly.instantiate(MEMORY_MODULE.buffer, { env: { imported } });

    const stats = getWasmMemoryStats();
    expect(stats.instances).toBe(before.instances + 2);
    expect(stats.bytes).toBe(before.bytes + 5 * PAGE_BYTES);
  });

  test('installing twice does not double-count', async ({ expect }) => {
    installWasmMemoryProbe();
    installWasmMemoryProbe();
    const before = getWasmMemoryStats();

    await WebAssembly.instantiate(MEMORY_MODULE.buffer);

    expect(getWasmMemoryStats().instances).toBe(before.instances + 1);
  });
});
