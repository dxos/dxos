//
// Copyright 2026 DXOS.org
//

import subductionWasmUrl from '@automerge/automerge-subduction/wasm?url';
import automergeWasmUrl from '@automerge/automerge/automerge.wasm?url';
import { initializeWasm } from '@automerge/automerge/slim';

import initSubductionWasm from './subduction-wasm.js';

let initialized: Promise<void> | undefined;

/**
 * Initializes the automerge and subduction wasm modules for this realm (page or worker).
 *
 * The bundler resolves the automerge packages to their `slim` entrypoints (`slimWasm` in
 * vite.config.ts), which do no wasm work at module evaluation — so every realm must await this
 * before its first automerge call (client boot, Repo construction). Idempotent; concurrent
 * callers share one initialization, and a failed attempt is retried on the next call. URL inputs
 * keep wasm-bindgen on `instantiateStreaming`.
 */
export const initAutomergeWasm = (): Promise<void> => {
  // Both inits settle before a failure clears the memo — clearing on the first rejection would
  // let a retry overlap the still-pending sibling — and the retry then re-runs both (wasm-bindgen
  // caches an already-initialized module, so the succeeded half is a no-op).
  initialized ??= Promise.allSettled([
    initializeWasm(automergeWasmUrl),
    initSubductionWasm({ module_or_path: subductionWasmUrl }),
  ]).then((results) => {
    const failed = results.find((result) => result.status === 'rejected');
    if (failed) {
      initialized = undefined;
      throw failed.reason;
    }
  });
  return initialized;
};
