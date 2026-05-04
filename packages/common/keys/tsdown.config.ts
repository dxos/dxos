// Copyright 2026 DXOS.org

import { defineConfig } from '@dxos/dx-tsdown/config';

export default defineConfig({
  importGlobals: true,
  bundlePackages: ["base32-decode","base32-encode","to-data-view"],
});
