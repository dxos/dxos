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
  '0061736d01000000' + // Magic, version.
  '0503010001' + // Memory section: one memory, minimum one page.
  '070a01066d656d6f72790200'; // Export section: "memory".

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

  test('a memory built in JS is counted even if no module ever exports it', async ({ expect }) => {
    installWasmMemoryProbe();
    const before = getWasmMemoryStats();

    // The route neither instantiation hook sees: constructed here, handed to a module's imports
    // later or never. Before the constructor was wrapped this realm reported zero for it.
    const standalone = new WebAssembly.Memory({ initial: 3 });
    expect(standalone.buffer.byteLength).toBe(3 * PAGE_BYTES);

    const stats = getWasmMemoryStats();
    expect(stats.instances).toBe(before.instances + 1);
    expect(stats.bytes).toBe(before.bytes + 3 * PAGE_BYTES);
  });

  test('a memory reached by two routes is counted once', async ({ expect }) => {
    installWasmMemoryProbe();
    const before = getWasmMemoryStats();

    // Constructed here (the constructor hook sees it) and then passed into a module's imports
    // (the import hook sees it again). Counting both inflates the realm by the memory's size.
    const shared = new WebAssembly.Memory({ initial: 8 });
    await WebAssembly.instantiate(MEMORY_MODULE.buffer, { env: { shared } });

    const stats = getWasmMemoryStats();
    // The module's own exported page is the second instance; the imported memory is not a third.
    expect(stats.instances).toBe(before.instances + 2);
    expect(stats.bytes).toBe(before.bytes + 9 * PAGE_BYTES);
  });

  test('shared memory is reported separately, so a cross-realm total can subtract it', async ({ expect }) => {
    installWasmMemoryProbe();
    const before = getWasmMemoryStats();

    // One `SharedArrayBuffer`-backed memory is visible in every realm it is posted to, so a sum of
    // the realm columns counts this allocation once per realm unless the total subtracts it.
    const shared = new WebAssembly.Memory({ initial: 2, maximum: 2, shared: true });
    expect(shared.buffer).toBeInstanceOf(SharedArrayBuffer);

    const stats = getWasmMemoryStats();
    expect(stats.sharedBytes).toBe(before.sharedBytes + 2 * PAGE_BYTES);
    expect(stats.bytes).toBe(before.bytes + 2 * PAGE_BYTES);
  });

  test('bytes are attributed to the creating script', async ({ expect }) => {
    installWasmMemoryProbe();

    await WebAssembly.instantiate(MEMORY_MODULE.buffer);

    // Keyed by file rather than by module URL: the stack is the only source available in a worker,
    // where `document.currentScript` does not exist.
    const attributed = Object.entries(getWasmMemoryStats().byModule);
    expect(attributed.length).toBeGreaterThan(0);
    expect(attributed.reduce((total, [, bytes]) => total + bytes, 0)).toBe(getWasmMemoryStats().bytes);
  });
});
