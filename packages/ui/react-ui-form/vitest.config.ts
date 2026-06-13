//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ThemePlugin } from '@dxos/ui-theme/plugin';

import { createConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default createConfig({
  dirname,
  node: {
    environment: 'happy-dom',
    setupFiles: ['./src/vitest-setup.ts'],
    plugins: [ThemePlugin({})],
  },
  // Share the WASM-backed (`@dxos/echo` -> Automerge/SQLite) module graph across story files; with
  // per-file isolation the many ECHO-importing field stories re-instantiate the WASM and exhaust the
  // headless-chromium context ("WebAssembly instance ran out of memory during import").
  storybook: { isolate: false },
});
