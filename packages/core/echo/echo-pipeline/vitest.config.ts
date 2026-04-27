//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: {
    // The Subduction / automerge WASM modules share state inside a single
    // vitest worker. Test files in this package construct many `Repo` /
    // `MemorySigner` / `Automerge.from` instances; with the workspace default
    // (`isolate: false`, `singleThread: true`) the WASM heap accumulates state
    // across files and intermittently panics in later files (`unreachable`,
    // `memory access out of bounds`). Force per-file worker isolation so each
    // file gets a fresh module graph and a fresh WASM instance.
    isolate: true,
  },
  // TODO(wittjosiah): Browser tests.
  // browser: {
  //   nodeExternal: true,
  // },
});
