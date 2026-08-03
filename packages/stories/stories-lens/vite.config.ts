//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  jsx: 'react',
  // Two clients, two identities, and a real invitation before the first assertion — well past the
  // 15s default.
  test: { node: true, storybook: { timeout: 60_000 } },
});
