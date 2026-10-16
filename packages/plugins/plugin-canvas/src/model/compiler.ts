//
// Copyright 2026 DXOS.org
//

import wasmURL from 'esbuild-wasm/esbuild.wasm?url';

import { createEsbuildCompiler } from '@dxos/react-ui-canvas/headless';

/** Compiles generator sources once per page; in a browser esbuild loads its binary from the bundled URL. */
export const generatorCompiler = createEsbuildCompiler({
  wasmURL: typeof document === 'undefined' ? undefined : wasmURL,
});
