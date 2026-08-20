//
// Copyright 2026 DXOS.org
//

import subductionWasmUrl from '@automerge/automerge-subduction/wasm?url';
import automergeWasmUrl from '@automerge/automerge/automerge.wasm?url';
import { initializeWasm } from '@automerge/automerge/slim';

import initSubductionWasm from './subduction-wasm';

let initialized: Promise<void> | undefined;

/**
 * Initializes the automerge and subduction wasm modules for this realm (page or worker).
 *
 * The bundler resolves the automerge packages to their `slim` entrypoints (`slimWasm` in
 * vite.config.ts), which do no wasm work at module evaluation — so every realm must await this
 * before its first automerge call (client boot, Repo construction). Idempotent; concurrent
 * callers share one initialization. URL inputs keep wasm-bindgen on `instantiateStreaming`.
 */
export const initAutomergeWasm = (): Promise<void> => {
  // A rejection clears the memo so a later call retries instead of caching a transient failure.
  initialized ??= Promise.all([
    initializeWasm(automergeWasmUrl),
    initSubductionWasm({ module_or_path: subductionWasmUrl }),
  ]).then(
    () => undefined,
    (error) => {
      initialized = undefined;
      throw error;
    },
  );
  return initialized;
};
