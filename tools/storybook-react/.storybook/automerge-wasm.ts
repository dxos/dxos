//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

import subductionWasmUrl from '@automerge/automerge-subduction/wasm?url';
import automergeWasmUrl from '@automerge/automerge/automerge.wasm?url';
import { initializeWasm } from '@automerge/automerge/slim';

import initSubductionWasm from './subduction-wasm.js';

let initialized: Promise<void> | undefined;

/**
 * Initializes the automerge and subduction wasm for this realm (page or worker) under
 * `slimWasmPlugin`, whose `slim` entrypoints do no wasm work at module evaluation. Idempotent.
 */
export const initEchoHostWasm = (): Promise<void> => {
  initialized ??= Promise.all([
    initializeWasm(automergeWasmUrl),
    initSubductionWasm({ module_or_path: subductionWasmUrl }),
  ]).then(() => undefined);
  return initialized;
};
