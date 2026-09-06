//
// Copyright 2026 DXOS.org
//

import automergeWasmUrl from '@automerge/automerge/automerge.wasm?url';
import { initializeWasm } from '@automerge/automerge/slim';

/**
 * Initializes automerge's wasm for the page.
 *
 * The chat thread reaches `@dxos/echo` (its messages are ECHO objects), and echo reaches automerge.
 * `Vite.ts` resolves automerge to its `slim` entry point, which does no wasm work at module
 * evaluation — the full entry point initializes with top-level await, which the dependency
 * pre-bundler rewrites into glue whose memory is never set up. So the initialization happens here,
 * once, before anything renders.
 */
let initialized: Promise<void> | undefined;

export const initAutomergeWasm = (): Promise<void> => {
  // A failed attempt clears the memo so the next call retries; wasm-bindgen treats an
  // already-initialized module as a no-op, so a retry is safe.
  initialized ??= initializeWasm(automergeWasmUrl).then(
    () => undefined,
    (error: unknown) => {
      initialized = undefined;
      throw error;
    },
  );
  return initialized;
};
