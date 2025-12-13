//
// Copyright 2025 DXOS.org
//

import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

// TODO(wittjosiah): Get working with vitest.base.config.ts.
export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: "happy-dom",
  },
});
