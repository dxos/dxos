// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  entry: ["src/index.ts","src/testing/index.ts","src/packlets/locks/node.ts","src/packlets/locks/browser.ts","src/packlets/diagnostics/diagnostics-broadcast.ts","src/packlets/diagnostics/browser-diagnostics-broadcast.ts"],
  injectGlobals: true,
});
