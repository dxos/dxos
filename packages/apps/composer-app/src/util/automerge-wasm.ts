//
// Copyright 2026 DXOS.org
//

import subductionWasmUrl from '@automerge/automerge-subduction/wasm?url';
import automergeWasmUrl from '@automerge/automerge/automerge.wasm?url';
import { initializeWasm } from '@automerge/automerge/slim';

import { installWasmMemoryProbe } from '@dxos/util';

import initSubductionWasm from './subduction-wasm.js';

/**
 * Memoizes one wasm initialization; a failed attempt clears the memo so the next call retries.
 */
const memoizeInit = (init: () => Promise<unknown>): (() => Promise<void>) => {
  let initialized: Promise<void> | undefined;
  return () => {
    // Before the first instantiation, and this is the realm's earliest wasm: the dedicated worker
    // awaits this in `onBeforeStart`, ahead of the runtime that opens SQLite, so one call here
    // counts automerge, subduction and SQLite's wasm alike. Reordering that would leave SQLite's
    // linear memory uncounted, which shows up as a drop in the probe's `instances`.
    installWasmMemoryProbe();
    initialized ??= init().then(
      () => undefined,
      (err) => {
        initialized = undefined;
        throw err;
      },
    );
    return initialized;
  };
};

/**
 * Initializes the automerge wasm module for this realm (page or worker).
 *
 * The bundler resolves the automerge packages to their `slim` entrypoints (`slimWasm` in
 * vite.config.ts), which do no wasm work at module evaluation — so every realm must await this
 * before its first automerge call. Enough for a realm that only runs an ECHO client against
 * services elsewhere; a realm that hosts echo also needs {@link initEchoHostWasm}. Idempotent.
 * URL inputs keep wasm-bindgen on `instantiateStreaming`.
 */
export const initAutomergeWasm = memoizeInit(() => initializeWasm(automergeWasmUrl));

const initSubduction = memoizeInit(() => initSubductionWasm({ module_or_path: subductionWasmUrl }));

/**
 * Initializes the automerge and subduction wasm modules for a realm that hosts echo (the
 * dedicated worker, HOST mode, recovery), where automerge-repo constructs Subduction.
 */
export const initEchoHostWasm = async (): Promise<void> => {
  await Promise.all([initAutomergeWasm(), initSubduction()]);
};
