//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  // These three ship CJS only and read `Buffer` as a free global.
  bundle: ['base32-decode', 'base32-encode', 'to-data-view'],
  importGlobals: true,
  test: { node: true, workerd: true },
});
