//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  // Node-only bot (discord.js); skip the browser node-std polyfill injection.
  nodeTarget: true,
});
