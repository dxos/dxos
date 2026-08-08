//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // Client init (identity, spaces, indexed flush) gates the first render and each play then allows
  // 30s for the template to materialize its article, so the test timeout has to clear those bounds
  // or the story can never pass regardless of how fast the run actually is.
  test: { node: { environment: 'jsdom' }, storybook: { timeout: 120_000 } },
});
