//
// Copyright 2026 DXOS.org
//

import wasmURL from 'esbuild-wasm/esbuild.wasm?url';

import { createEsbuildCompiler } from '@dxos/animation';

/** Compiles effect sources once per page; in a browser esbuild loads its binary from the bundled URL. */
export const effectCompiler = createEsbuildCompiler({
  wasmURL: typeof document === 'undefined' ? undefined : wasmURL,
});

/** The effect worker: agent-written code runs there, away from the page; the bundler emits it as its own chunk. */
export const createEffectWorker = (): Worker => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
