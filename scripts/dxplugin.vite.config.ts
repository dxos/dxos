//
// Copyright 2026 DXOS.org
//

import { defineConfig } from 'vite';

/**
 * Minimal config for `generate-dxplugin.ts`: workspace packages are resolved through their
 * `source` export condition so the generator evaluates plugin TypeScript directly, with no build.
 */
export default defineConfig({
  resolve: { conditions: ['source', 'browser', 'import', 'module', 'default'] },
  ssr: { resolve: { conditions: ['source', 'browser', 'import', 'module', 'default'] } },
});
