//
// Copyright 2026 DXOS.org
//

import subductionWasmUrl from '@automerge/automerge-subduction/wasm?url';
import automergeWasmUrl from '@automerge/automerge/automerge.wasm?url';
import { initializeWasm } from '@automerge/automerge/slim';

import initSubductionWasm from './subduction-wasm.js';

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

/** Must finish before the realm's first automerge call. */
export const initAutomergeWasm = memoizeInit(() => initializeWasm(automergeWasmUrl));

const initSubduction = memoizeInit(() => initSubductionWasm({ module_or_path: subductionWasmUrl }));

export const initEchoHostWasm = async (): Promise<void> => {
  await Promise.all([initAutomergeWasm(), initSubduction()]);
};
