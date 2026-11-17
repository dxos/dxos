//
// Copyright 2026 DXOS.org
//

import subductionWasmUrl from '@automerge/automerge-subduction/wasm?url';
import automergeWasmUrl from '@automerge/automerge/automerge.wasm?url';
import { initializeWasm } from '@automerge/automerge/slim';

import initSubductionWasm from './subduction-wasm.js';

/** Memoizes one initialization; a failed attempt clears the memo so the next call retries. */
const memoizeInit = (init: () => Promise<unknown>): (() => Promise<void>) => {
  let initialized: Promise<void> | undefined;
  return () =>
    (initialized ??= init().then(
      () => undefined,
      (err) => {
        initialized = undefined;
        throw err;
      },
    ));
};

/**
 * Initializes automerge's wasm for this realm, which `slimWasm` (vite.config.ts) resolves to the `slim` entrypoint.
 * Must finish before the realm's first automerge call.
 */
export const initAutomergeWasm = memoizeInit(() => initializeWasm(automergeWasmUrl));

const initSubduction = memoizeInit(() => initSubductionWasm({ module_or_path: subductionWasmUrl }));

/** Initializes automerge and subduction for the worker that hosts echo, whose repo constructs Subduction. */
export const initEchoHostWasm = async (): Promise<void> => {
  await Promise.all([initAutomergeWasm(), initSubduction()]);
};
