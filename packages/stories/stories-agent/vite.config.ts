//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // The first story in a file pays the whole lazy module-load bill, and the collaboration test joins four clients
  // before stepping its scene; neither fits the 15s browser-mode default.
  test: { node: { environment: 'jsdom' }, storybook: { timeout: 120_000 } },
});
