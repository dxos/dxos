//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // The first story in a file pays the whole lazy module-load bill, which the 15s browser-mode default cannot cover.
  test: { node: { environment: 'jsdom' }, storybook: { timeout: 60_000 } },
});
